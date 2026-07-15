import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";
import path from "path";

import { env } from "@/config/env";
import { logger } from "@/infrastructure/logger";

const isCloudinaryConfigured = !!(
  env.CLOUDINARY_CLOUD_NAME &&
  env.CLOUDINARY_API_KEY &&
  env.CLOUDINARY_API_SECRET
);

console.log({
  key: env.AWS_ACCESS_KEY_ID,
  bucket: env.AWS_S3_BUCKET,
  region: env.AWS_REGION,
});

const isS3Configured = !!(
  env.AWS_ACCESS_KEY_ID &&
  env.AWS_SECRET_ACCESS_KEY &&
  env.AWS_S3_BUCKET &&
  env.AWS_REGION
);

let s3Client: S3Client | null = null;

if (isS3Configured) {
  s3Client = new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
    },
  });
  logger.info("🪣 AWS S3 storage provider initialized");
} else if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
  logger.info("☁️ Cloudinary storage provider initialized");
} else {
  logger.info("💾 Local file storage initialized (no S3 or Cloudinary config found)");
}

export class StorageProvider {
  private static UPLOAD_DIR = path.resolve(__dirname, "../../../public/uploads");

  /**
   * Upload a file buffer to AWS S3, Cloudinary, or save it locally.
   * Returns the URL of the uploaded asset and a unique key for deletion.
   */
  async upload(
    file: Express.Multer.File,
    folder = "attachments",
  ): Promise<{ url: string; key: string }> {
    if (isS3Configured && s3Client) {
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}${path.extname(file.originalname)}`;
      const key = `${folder}/${uniqueName}`;

      const command = new PutObjectCommand({
        Bucket: env.AWS_S3_BUCKET!,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await s3Client.send(command);

      const url = `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
      return { url, key };
    }

    if (isCloudinaryConfigured) {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: `syncspace/${folder}` },
          (error, result) => {
            if (error || !result) {
              logger.error({ error }, "Cloudinary upload failed");
              return reject(new Error("Cloudinary upload failed"));
            }
            resolve({
              url: result.secure_url,
              key: result.public_id,
            });
          },
        );
        uploadStream.end(file.buffer);
      });
    }

    // Fallback: Local Storage
    await fs.mkdir(StorageProvider.UPLOAD_DIR, { recursive: true });
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}${path.extname(file.originalname)}`;
    const filePath = path.join(StorageProvider.UPLOAD_DIR, uniqueName);

    await fs.writeFile(filePath, file.buffer);

    // Build a local absolute URL
    const url = `http://localhost:${env.PORT}/uploads/${uniqueName}`;
    return {
      url,
      key: uniqueName,
    };
  }

  /**
   * Delete a file from AWS S3, Cloudinary, or local storage using its absolute URL.
   */
  async delete(url: string): Promise<void> {
    if (url.includes(".amazonaws.com/") && isS3Configured && s3Client) {
      const key = url.split(".amazonaws.com/")[1];
      if (key) {
        try {
          const command = new DeleteObjectCommand({
            Bucket: env.AWS_S3_BUCKET!,
            Key: key,
          });
          await s3Client.send(command);
        } catch (error) {
          logger.error({ error, key }, "AWS S3 file deletion failed");
          throw error;
        }
      }
      return;
    }

    if (isCloudinaryConfigured && url.includes("/upload/")) {
      // Extract Cloudinary public ID from URL
      const parts = url.split("/upload/");
      if (parts.length < 2) {
        return;
      }
      const pathAfterUpload = parts[1]!;
      const pathWithoutVersion = pathAfterUpload.replace(/^v\d+\//, "");
      const lastDotIndex = pathWithoutVersion.lastIndexOf(".");
      const key =
        lastDotIndex === -1 ? pathWithoutVersion : pathWithoutVersion.substring(0, lastDotIndex);

      await new Promise<void>((resolve, reject) => {
        cloudinary.uploader.destroy(key, (error) => {
          if (error) {
            logger.error({ error, key }, "Cloudinary file deletion failed");
            return reject(error);
          }
          resolve();
        });
      });
      return;
    }

    // Fallback: Local Storage filename extraction
    if (url.includes("/uploads/")) {
      const parts = url.split("/uploads/");
      if (parts.length < 2) {
        return;
      }
      const key = parts[1]!;
      const filePath = path.join(StorageProvider.UPLOAD_DIR, key);
      try {
        await fs.unlink(filePath);
      } catch (error: any) {
        if (error.code !== "ENOENT") {
          logger.error({ error, key }, "Local file deletion failed");
          throw error;
        }
      }
    }
  }
}
export const storageProvider = new StorageProvider();
