/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  i18n: {
    locales: ['en', 'ja'],
    defaultLocale: 'en',
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.bayut.com' },
      { protocol: 'https', hostname: 'bayut-production.s3.eu-central-1.amazonaws.com' },
    ],
  },
}
module.exports = nextConfig
