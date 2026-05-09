import { Client as MinioClient } from 'minio';
import dotenv from 'dotenv';

dotenv.config();

// MinIO client configuration
if (!process.env.MINIO_SECRET_KEY || !process.env.MINIO_ACCESS_KEY) {
  throw new Error('MINIO_ACCESS_KEY and MINIO_SECRET_KEY environment variables are required');
}

export const minioClient = new MinioClient({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

export const BUCKET_NAME = process.env.MINIO_BUCKET || 'nexus-uploads';

// Initialize bucket
export async function initializeBucket(): Promise<void> {
  try {
    const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
    if (!bucketExists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
      
      // Set bucket policy for public read (optional, adjust as needed)
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
          },
        ],
      };
      
      await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
      console.log(`✅ Bucket '${BUCKET_NAME}' created`);
    } else {
      console.log(`✅ Bucket '${BUCKET_NAME}' already exists`);
    }
  } catch (error) {
    console.error('❌ Error initializing MinIO bucket:', error);
    throw error;
  }
}

// Generate presigned URL for upload
export async function getPresignedUploadUrl(
  objectName: string,
  expirySeconds: number = 3600
): Promise<string> {
  return await minioClient.presignedPutObject(BUCKET_NAME, objectName, expirySeconds);
}

// Generate presigned URL for download
export async function getPresignedDownloadUrl(
  objectName: string,
  expirySeconds: number = 3600
): Promise<string> {
  return await minioClient.presignedGetObject(BUCKET_NAME, objectName, expirySeconds);
}

// Upload file
export async function uploadFile(
  objectName: string,
  filePath: string,
  contentType?: string
): Promise<void> {
  await minioClient.fPutObject(BUCKET_NAME, objectName, filePath, {
    'Content-Type': contentType || 'application/octet-stream',
  });
}

// Delete file
export async function deleteFile(objectName: string): Promise<void> {
  await minioClient.removeObject(BUCKET_NAME, objectName);
}

export default minioClient;
