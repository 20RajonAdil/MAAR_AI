/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep NVIDIA_API_KEY server-only. It is never referenced with the
  // NEXT_PUBLIC_ prefix, so Next.js will not inline it into client bundles.
  images: {
    formats: ['image/webp'],
  },
};

export default nextConfig;
