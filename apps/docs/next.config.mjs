import { createMDX } from "fumadocs-mdx/next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  webpack: (cfg, { webpack }) => {
    cfg.plugins ??= [];
    cfg.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^fumadocs-mdx:collections\/server$/,
        path.resolve(__dirname, ".source/server.ts"),
      ),
    );
    return cfg;
  },
};

const withMDX = createMDX();

export default withMDX(config);
