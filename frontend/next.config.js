/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: [
      's3.amazonaws.com',
      'res.cloudinary.com',
    ],
  },
};

module.exports = nextConfig;
