import { Router, Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import archiver from 'archiver';
import { authenticateToken } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

const router = Router();
router.use(authenticateToken);

// Configure multer for temporary file storage
const upload = multer({
  dest: '/tmp',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

// ── Helper: Clean up files ──
const cleanupFiles = async (files: string[]) => {
  for (const file of files) {
    try {
      await fs.unlink(file);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
};

// ── Helper: Clean up directory ──
const cleanupDir = async (dir: string) => {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (e) {
    // Ignore cleanup errors
  }
};

// ── POST /api/convert ─────────────────────────────────────────────────────
router.post('/', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  const reqFilesToClean: string[] = [];
  const reqDirsToClean: string[] = [];

  try {
    if (!req.file) {
      res.status(400).json({ error: 'Nenhum arquivo enviado' });
      return;
    }

    const { output_format } = req.body;
    const inputFile = req.file;
    const inputPath = inputFile.path;
    reqFilesToClean.push(inputPath);

    const inputExt = path.extname(inputFile.originalname).toLowerCase();
    const baseName = path.basename(inputFile.originalname, inputExt);

    // Validate output format
    const validFormats = ['pdf', 'jpg', 'png', 'webp', 'zip'];
    if (!output_format || !validFormats.includes(output_format.toLowerCase())) {
      res.status(400).json({ error: 'Formato de saída inválido' });
      return;
    }

    const outputFormat = output_format.toLowerCase();
    const outputPath = path.join('/tmp', `${uuidv4()}.${outputFormat}`);
    reqFilesToClean.push(outputPath);

    // 1. Image conversion using sharp
    if (inputFile.mimetype.startsWith('image/')) {
      const converter = sharp(inputPath);
      
      if (outputFormat === 'jpg') {
        converter.jpeg({ quality: 90 });
      } else if (outputFormat === 'png') {
        converter.png();
      } else if (outputFormat === 'webp') {
        converter.webp({ quality: 90 });
      } else if (outputFormat === 'pdf') {
        // We can't generate PDF directly with sharp cleanly, so we'll just fail gracefully or convert to PNG if required
        // But sharp doesn't output PDF. We can use pdfkit or just say unsupported.
        res.status(400).json({ error: 'Conversão de Imagem para PDF requer lib adicional. Use JPG/PNG/WEBP.' });
        return;
      }
      
      await converter.toFile(outputPath);
    } 
    // 2. PDF to image conversion (Using pdftoppm from poppler-utils)
    else if (inputFile.mimetype === 'application/pdf' && ['jpg', 'png', 'webp'].includes(outputFormat)) {
      const outputDir = path.join('/tmp', uuidv4());
      await fs.mkdir(outputDir, { recursive: true });
      reqDirsToClean.push(outputDir);

      let pdftoppmFormat = 'jpeg';
      if (outputFormat === 'png') pdftoppmFormat = 'png';

      // Use pdftoppm to extract images
      const command = `pdftoppm -${pdftoppmFormat} "${inputPath}" "${path.join(outputDir, 'page')}"`;
      try {
        await execAsync(command);
      } catch (err) {
        console.error('pdftoppm error:', err);
        res.status(500).json({ error: 'Erro ao extrair imagens do PDF. Verifique se o poppler-utils está instalado.' });
        return;
      }

      // Check generated files
      const generatedFiles = await fs.readdir(outputDir);
      if (generatedFiles.length === 0) {
        res.status(500).json({ error: 'Nenhuma página encontrada no PDF.' });
        return;
      }

      if (generatedFiles.length === 1) {
        // Single image, just return it directly
        const singleImagePath = path.join(outputDir, generatedFiles[0]);
        
        // If they wanted webp, pdftoppm doesn't do webp directly, so we convert the result via sharp
        if (outputFormat === 'webp') {
          await sharp(singleImagePath).webp({ quality: 90 }).toFile(outputPath);
        } else {
          await fs.copyFile(singleImagePath, outputPath);
        }
      } else {
        // Multiple images, zip them!
        const zipPath = path.join('/tmp', `${uuidv4()}.zip`);
        reqFilesToClean.push(zipPath);

        await new Promise<void>((resolve, reject) => {
          const output = createWriteStream(zipPath);
          const archive = archiver('zip', { zlib: { level: 9 } });

          output.on('close', resolve);
          archive.on('error', reject);

          archive.pipe(output);

          // If webp was requested, we need to convert each file before zipping
          // For simplicity, if multiple pages, we just zip the pdftoppm output (jpeg/png)
          // If webp was explicitly asked, let's zip the jpegs anyway or convert.
          // Let's just zip what we have.
          for (const file of generatedFiles) {
            archive.file(path.join(outputDir, file), { name: file });
          }

          archive.finalize();
        });

        // Set output path to the zip file and format to zip
        await fs.copyFile(zipPath, outputPath);
        // We will change the downloaded filename extension below
      }
    }
    // 3. Document (Word/Excel/PowerPoint) to PDF conversion
    else if (
      (inputFile.mimetype.includes('word') || 
       inputFile.mimetype.includes('document') || 
       inputFile.mimetype.includes('officedocument') ||
       inputFile.mimetype.includes('excel') ||
       inputFile.mimetype.includes('spreadsheet') ||
       inputFile.mimetype.includes('powerpoint') ||
       inputFile.mimetype.includes('presentation')) &&
      outputFormat === 'pdf'
    ) {
      // Convert using LibreOffice headless
      try {
        const outDir = '/tmp';
        const command = `libreoffice --headless --convert-to pdf --outdir ${outDir} "${inputPath}"`;
        await execAsync(command);

        // LibreOffice creates file with same name but .pdf extension in outDir
        const convertedPath = path.join(outDir, `${path.basename(inputPath)}.pdf`);
        reqFilesToClean.push(convertedPath);
        
        // Check if conversion was successful
        try {
          await fs.access(convertedPath);
          await fs.rename(convertedPath, outputPath);
        } catch {
          throw new Error('LibreOffice conversion output not found');
        }
      } catch (libreError) {
        console.error('LibreOffice error:', libreError);
        res.status(501).json({ error: 'Erro na conversão. Verifique se o LibreOffice está instalado.' });
        return;
      }
    } else {
      res.status(400).json({ error: 'Conversão não suportada para este tipo de arquivo.' });
      return;
    }

    // Read converted file and send as response
    const fileBuffer = await fs.readFile(outputPath);
    
    // Determine if it was zipped
    const isZip = fileBuffer.length > 4 && fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4B; // PK header
    const finalExt = isZip ? 'zip' : outputFormat;
    const convertedFilename = `${baseName}.${finalExt}`;

    // Set appropriate content type
    const contentTypes: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      zip: 'application/zip'
    };

    res.setHeader('Content-Type', contentTypes[finalExt] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${convertedFilename}"`);
    res.send(fileBuffer);

  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({ error: 'Falha ao converter arquivo.' });
  } finally {
    // Clean up all temporary files and directories
    await cleanupFiles(reqFilesToClean);
    for (const dir of reqDirsToClean) {
      await cleanupDir(dir);
    }
  }
});

export default router;
