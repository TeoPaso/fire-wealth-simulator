/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fully static, client-only app: no server runtime is needed (data lives in localStorage).
  output: 'export',
  reactStrictMode: true,
  images: { unoptimized: true },
};

export default nextConfig;
