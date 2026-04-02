/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };
    config.externals = config.externals || [];
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ["@lit-protocol/lit-node-client"],
  },
  images: {
    domains: ["w3s.link", "ipfs.io"],
  },
  env: {
    NEXT_PUBLIC_FILECOIN_RPC:
      process.env.NEXT_PUBLIC_FILECOIN_RPC ||
      "https://api.calibration.node.glif.io/rpc/v1",
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID || "314159",
    NEXT_PUBLIC_LIT_NETWORK: process.env.NEXT_PUBLIC_LIT_NETWORK || "datil-test",
    NEXT_PUBLIC_IPFS_GATEWAY:
      process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://w3s.link/ipfs",
  },
};

export default nextConfig;
