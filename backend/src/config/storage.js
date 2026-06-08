const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const cloudinary = require('cloudinary').v2;

const provider = (process.env.STORAGE_PROVIDER || 's3').toLowerCase();

// Cloudflare R2 is S3-compatible — same SDK, just a custom endpoint, the
// "auto" region and path-style addressing. Accept a few aliases.
const isR2 = ['r2', 'cloudflare', 'cloudflare-r2'].includes(provider);

let s3Client;

if (isR2) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    },
  });
} else if (provider === 's3') {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

module.exports = { provider, isR2, s3Client, cloudinary, PutObjectCommand, GetObjectCommand, getSignedUrl };
