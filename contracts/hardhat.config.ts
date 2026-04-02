import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
      evmVersion: "cancun",
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    calibration: {
      url: "https://api.calibration.node.glif.io/rpc/v1",
      chainId: 314159,
      accounts: [PRIVATE_KEY],
      timeout: 120000,
    },
    filecoin: {
      url: "https://api.node.glif.io",
      chainId: 314,
      accounts: [PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      calibration: "no-api-key-needed",
      filecoin: "no-api-key-needed",
    },
    customChains: [
      {
        network: "calibration",
        chainId: 314159,
        urls: {
          apiURL: "https://calibration.filscan.io/api",
          browserURL: "https://calibration.filscan.io",
        },
      },
      {
        network: "filecoin",
        chainId: 314,
        urls: {
          apiURL: "https://filscan.io/api",
          browserURL: "https://filscan.io",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;
