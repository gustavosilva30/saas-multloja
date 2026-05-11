import { Router, Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { authenticateToken } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

// Configure multer for temporary file storage
const upload = multer({
  dest: '/tmp',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

// ── POST /api/convert ─────────────────────────────────────────────────────
// Convert files (images, PDF, Word) to different formats
router.post('/', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const { output_format } = req.body;
    const inputFile = req.file;
    const inputPath = inputFile.path;
    const inputExt = path.extname(inputFile.originalname).toLowerCase();
    const baseName = path.basename(inputFile.originalname, inputExt);

    // Validate output format
    const validFormats = ['pdf', 'jpg', 'png', 'webp'];
    if (!output_format || !validFormats.includes(output_format.toLowerCase())) {
      res.status(400).json({ error: 'Invalid output format' });
      await fs.unlink(inputPath);
      return;
    }

    const outputFormat = output_format.toLowerCase() as 'pdf' | 'jpg' | 'png' | 'webp';
    const outputPath = path.join('/tmp', `${baseName}.${outputFormat}`);

    // Image conversion using sharp
    if (inputFile.mimetype.startsWith('image/')) {
      const converter = sharp(inputPath);
      
      if (outputFormat === 'jpg') {
        converter.jpeg({ quality: 90 });
      } else if (outputFormat === 'png') {
        converter.png();
      } else if (outputFormat === 'webp') {
        converter.webp({ quality: 90 });
      } else if (outputFormat === 'pdf') {
        // For PDF, we'll convert to PNG for now (PDF generation requires additional library)
        converter.png();
      }
      
      await converter.toFile(outputPath);
    } 
    // PDF to image conversion
    else if (inputFile.mimetype === 'application/pdf' && (outputFormat === 'jpg' || outputFormat === 'png' || outputFormat === 'webp')) {
      // PDF to image conversion would require pdf-poppler or similar
      // For now, return error indicating this requires additional setup
      await fs.unlink(inputPath);
      res.status(501).json({ error: 'PDF to image conversion requires LibreOffice installation. See Dockerfile setup.' });
      return;
    }
    // Word to PDF conversion
    else if (
      (inputFile.mimetype.includes('word') || 
       inputFile.mimetype.includes('document') || 
       inputFile.mimetype.includes('officedocument.wordprocessingml')) &&
      outputFormat === 'pdf'
    ) {
      // Word to PDF conversion using LibreOffice
      try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        // Convert using LibreOffice headless
        const command = `libreoffice --headless --convert-to pdf --outdir /tmp "${inputPath}"`;
        await execAsync(command);

        // LibreOffice creates file with same name but .pdf extension
        const convertedPath = path.join('/tmp', `${baseName}.pdf`);
        
        // Check if conversion was successful
        try {
          await fs.access(convertedPath);
          // Move to our expected output path
          await fs.rename(convertedPath, outputPath);
        } catch {
          throw new Error('LibreOffice conversion failed');
        }
      } catch (libreError) {
        console.error('LibreOffice error:', libreError);
        await fs.unlink(inputPath);
        res.status(501).json({ error: 'Word to PDF conversion requires LibreOffice installation. See Dockerfile setup.' });
        return;
      }
    } else {
      await fs.unlink(inputPath);
      res.status(400).json({ error: 'Unsupported conversion for this file type' });
      return;
    }

    // Clean up input file
    await fs.unlink(inputPath);

    // Read converted file and send as response
    const fileBuffer = await fs.readFile(outputPath);
    const convertedFilename = `${baseName}.${outputFormat}`;

    // Clean up output file after sending
    res.on('finish', async () => {
      try {
        await fs.unlink(outputPath);
      } catch (err) {
        console.error('Error cleaning up output file:', err);
      }
    });

    // Set appropriate content type
    const contentTypes: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    };

    res.setHeader('Content-Type', contentTypes[outputFormat]);
    res.setHeader('Content-Disposition', `attachment; filename="${convertedFilename}"`);
    res.send(fileBuffer);

  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({ error: 'Failed to convert file' });
  }
});

export default router;
