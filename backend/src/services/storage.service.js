const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs   = require('fs');
const { provider, isR2, s3Client, cloudinary, PutObjectCommand, GetObjectCommand, getSignedUrl } = require('../config/storage');
const logger = require('../utils/logger');

/**
 * Upload a buffer to the configured storage provider.
 * Returns the public URL of the uploaded file.
 *
 * STORAGE_PROVIDER=local  – saves to ./uploads/ and returns a /files/ URL (dev only)
 * STORAGE_PROVIDER=s3     – AWS S3
 * STORAGE_PROVIDER=r2     – Cloudflare R2 (S3-compatible)
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
    const baseUrl = process.env.BACKEND_URL
      || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null)
      || `http://localhost:${process.env.PORT || 4000}`;
    return `${baseUrl}/files/${folder}/${basename}`;
  }

  // Cloudflare R2 (S3-compatible API)
  if (isR2) {
    const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
    await s3Client.send(new PutObjectCommand({
      Bucket:      bucket,
      Key:         filename,
      Body:        buffer,
      ContentType: mimeType,
    }));
    logger.info('File uploaded to R2', { bucket, filename });

    // R2's S3 API endpoint is NOT publicly readable. Serve files via the
    // bucket's public URL (r2.dev managed domain or a custom domain), set as
    // CLOUDFLARE_R2_PUBLIC_URL. Fall back to the path-style endpoint URL.
    const publicBase = (process.env.CLOUDFLARE_R2_PUBLIC_URL || '').replace(/\/+$/, '');
    if (publicBase) return `${publicBase}/${filename}`;
    const endpoint = (process.env.CLOUDFLARE_R2_ENDPOINT || '').replace(/\/+$/, '');
    return `${endpoint}/${bucket}/${filename}`;
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

// ── Read-time signed URLs for private R2 objects ─────────────────
// R2's S3 API endpoint isn't publicly readable, so for viewing (CV, certs,
// audio) we mint a short-lived signed URL on demand. This keeps the bucket
// private (candidate files aren't world-accessible) and works for files
// already uploaded. Non-R2 / external URLs (Cloudinary, Vocaroo) pass through.
const isOurR2Url = (url) => {
  try {
    const host = new URL(url).hostname;
    const endpointHost = process.env.CLOUDFLARE_R2_ENDPOINT ? new URL(process.env.CLOUDFLARE_R2_ENDPOINT).hostname : null;
    const publicHost   = process.env.CLOUDFLARE_R2_PUBLIC_URL ? new URL(process.env.CLOUDFLARE_R2_PUBLIC_URL).hostname : null;
    return (endpointHost && host === endpointHost) || (publicHost && host === publicHost);
  } catch { return false; }
};

const extractKey = (url) => {
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  try {
    let p = decodeURIComponent(new URL(url).pathname).replace(/^\/+/, '');
    if (bucket && p.startsWith(`${bucket}/`)) p = p.slice(bucket.length + 1); // strip path-style bucket prefix
    return p || null;
  } catch { return null; }
};

// Return a viewable URL for a stored file. For our private R2 objects this is
// a signed URL valid for `expiresIn` seconds; everything else is unchanged.
const getViewableUrl = async (storedUrl, expiresIn = 3600) => {
  if (!storedUrl || !isR2 || !isOurR2Url(storedUrl)) return storedUrl;
  const key = extractKey(storedUrl);
  if (!key) return storedUrl;
  try {
    return await getSignedUrl(
      s3Client,
      new GetObjectCommand({ Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME, Key: key }),
      { expiresIn },
    );
  } catch (err) {
    logger.warn('Could not sign R2 URL', { error: err.message });
    return storedUrl;
  }
};

module.exports = { upload, getViewableUrl };
