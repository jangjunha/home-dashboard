import { defineConfig, loadEnv } from "vite";
import devServer from "@hono/vite-dev-server";
import tailwindcss from "@tailwindcss/vite";
import bunAdapter from "@hono/vite-dev-server/bun";
import build from "@hono/vite-build/bun";

export default defineConfig(({ mode }) => {
  if (mode === "client")
    return {
      esbuild: {
        jsxImportSource: "hono/jsx/dom",
      },
      build: {
        rollupOptions: {
          input: "./src/client.tsx",
          output: {
            dir: "./dist/static",
            entryFileNames: "client.js",
            assetFileNames: "[name].[ext]",
          },
        },
      },
    };

  const env = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, env);

  return {
    plugins: [
      build({
        entry: "./src/index.tsx",
      }),
      devServer({
        entry: "./src/index.tsx",
        adapter: bunAdapter,
      }),
      tailwindcss(),
    ],
  };
});
