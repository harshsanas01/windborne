/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.module.rules.push({
      test: /leaflet.*\.css$/,
      type: "asset/source", // stops CSS parsing
    });
    return config;
  },
};

module.exports = nextConfig;
