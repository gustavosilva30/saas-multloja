import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import sharp from 'sharp';
import { authenticateToken } from '../middleware/auth';
import { getPresignedUploadUrl, getPresignedDownloadUrl, BUCKET_NAME, minioClient } from '../config/minio';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Multer: 10MB max, memory storage (we re-encode with sharp before uploading)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Build a public URL for an object stored in MinIO.
// Prefers MINIO_PUBLIC_URL if set (e.g. https://cdn.example.com), otherwise
// reconstructs from MINIO_ENDPOINT/PORT/USE_SSL with path-style addressing.
function buildPublicUrl(objectName: string): string {
  const base = process.env.MINIO_PUBLIC_URL?.replace(/\/$/, '');
  if (base) return `${base}/${BUCKET_NAME}/${objectName}`;
  const proto = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
  const host = process.env.MINIO_ENDPOINT || 'localhost';
  const port = process.env.MINIO_PORT || '9000';
  const portSuffix = (proto === 'https' && port === '443') || (proto === 'http' && port === '80') ? '' : `:${port}`;
  return `${proto}://${host}${portSuffix}/${BUCKET_NAME}/${objectName}`;
}

// POST /api/upload — multipart upload with image compression.
// Resizes images larger than 1600px on the long edge and re-encodes as
// webp (quality 82) — typically 70-90% smaller than the original JPEG/PNG
// while keeping visual quality.
router.post('/', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }

    const tenantId = req.user!.tenant_id;
    const isImage = req.file.mimetype.startsWith('image/');

    let buffer: Buffer = req.file.buffer;
    let contentType = req.file.mimetype;
    let extension = req.file.originalname.split('.').pop()?.toLowerCase() || 'bin';

    if (isImage && req.file.mimetype !== 'image/svg+xml' && req.file.mimetype !== 'image/gif') {
      // Compress + resize while preserving aspect ratio
      buffer = await sharp(req.file.buffer)
        .rotate() // honor EXIF orientation
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      contentType = 'image/webp';
      extension = 'webp';
    }

    const objectName = `tenants/${tenantId}/products/${uuidv4()}.${extension}`;

    await minioClient.putObject(BUCKET_NAME, objectName, buffer, buffer.length, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    });

    const url = buildPublicUrl(objectName);
    res.json({ url, objectName, size: buffer.length, contentType });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Generate presigned URL for file upload
router.post(
  '/presign',
  [
    body('filename').trim().isLength({ min: 1 }),
    body('contentType').optional().trim(),
    body('folder').optional().trim(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const tenantId = req.user!.tenant_id;
      const { filename, contentType, folder } = req.body;

      // Generate unique object name with tenant isolation
      const uniqueId = uuidv4();
      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const objectName = folder
        ? `tenants/${tenantId}/${folder}/${uniqueId}_${sanitizedFilename}`
        : `tenants/${tenantId}/${uniqueId}_${sanitizedFilename}`;

      // Generate presigned URL (valid for 15 minutes)
      const uploadUrl = await getPresignedUploadUrl(objectName, 900);

      // Generate public URL for after upload
      const publicUrl = `/api/upload/file/${objectName}`;

      res.json({
        uploadUrl,
        publicUrl,
        objectName,
        bucket: BUCKET_NAME,
        expiresIn: 900,
      });
    } catch (error) {
      console.error('Presign error:', error);
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  }
);

// Get download URL for file
router.get('/download/:objectName(*)', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenant_id;
    const objectName = req.params.objectName;

    // Security check: ensure file belongs to tenant
    if (!objectName.startsWith(`tenants/${tenantId}/`)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Generate download URL (valid for 1 hour)
    const downloadUrl = await getPresignedDownloadUrl(objectName, 3600);

    res.json({ downloadUrl, expiresIn: 3600 });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
});

// Delete file
router.delete('/:objectName(*)', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenant_id;
    const objectName = req.params.objectName;

    // Security check
    if (!objectName.startsWith(`tenants/${tenantId}/`)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const { deleteFile } = await import('../config/minio');
    await deleteFile(objectName);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// List files for tenant
router.get('/list', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenant_id;
    const prefix = `tenants/${tenantId}/`;

    const { minioClient, BUCKET_NAME } = await import('../config/minio');
    
    const stream = minioClient.listObjectsV2(BUCKET_NAME, prefix, true);
    const files: any[] = [];

    stream.on('data', (obj: { name?: string; size?: number; lastModified?: Date }) => {
      files.push({
        name: obj.name,
        size: obj.size,
        lastModified: obj.lastModified,
        url: `/api/upload/file/${obj.name}`,
      });
    });

    stream.on('end', () => {
      res.json({ files, count: files.length });
    });

    stream.on('error', (err: Error) => {
      console.error('List error:', err);
      res.status(500).json({ error: 'Failed to list files' });
    });
  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

export default router;
