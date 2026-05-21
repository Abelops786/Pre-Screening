const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs   = require('fs');
const { provider, s3Client, cloudinary, PutObjectCommand } = require('../config/storage');
const logger = require('../utils/logger');

/**
 * Upload a buffer to the configured storage provider.
 * Returns the public URL of the uploaded file.
 *
 * STORAGE_PROVIDER=local  – saves to ./uploads/ and returns a /files/ URL (dev only)
 * STORAGE_PROVIDER=s3     – AWS S3
 * STORAGE_PROVIDER=cloudinary – Cloudinary
 */
const upload = async (buffer, originalName, mimeType, folder = 'uploads') => {
  const ext      = path.extname(originalName) || '';
  const filename = `${folder}/${uuidv4()}${ext}`;

  // Local filesystem – development convenience
  if (provider === 'local') {
    const uploadDir = path.join(__dirname, '../../uploads', folder);
    fs.mkdirSync(uploadDir, { recursive: true });
    const basename = path.basename(filename);
    fs.writeFileSync(path.join(uploadDir, basename), buffer);
    logger.info('File saved locally', { filename });
    return `http://localhost:${process.env.PORT || 4000}/files/${folder}/${basename}`;
  }

  if (provider === 's3') {
    const bucket = process.env.AWS_S3_BUCKET;
    await s3Client.send(new PutObjectCommand({
      Bucket:      bucket,
      Key:         filename,
      Body:        buffer,
      ContentType: mimeType,
    }));
    const region = process.env.AWS_REGION || 'us-east-1';
    return `https://${bucket}.s3.${region}.amazonaws.com/${filename}`;
  }

  // Cloudinary
  return new Promise((resolve, reject) => {
    const resourceType = mimeType.startsWith('audio') ? 'video' : 'raw';
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: uuidv4(), resource_type: resourceType },
      (err, result) => {
        if (err) {
          logger.error('Cloudinary upload error', { error: err.message });
          return reject(err);
        }
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
};

module.exports = { upload };
