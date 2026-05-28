/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    DASHBOARD_PASSWORD: process.env.DASHBOARD_PASSWORD,
  },
};
export default nextConfig;
