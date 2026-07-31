/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.1.7"],
  /* config options here */
  reactCompiler: true,
  async redirects() {
    return [
      {
        source: "/pos",
        destination: "/orders",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
