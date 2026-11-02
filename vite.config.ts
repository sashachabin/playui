import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { build } from "esbuild";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "playui-preview-vendor",
      resolveId(id) {
        if (id === "virtual:preview-vendor" || id === "virtual:library-types") return "\0" + id;
      },
      async load(id) {
        if (id === "\0virtual:library-types") {
          const packages = ["@skbkontur/react-ui", "antd"];
          const files = await Promise.all(
            packages.map(async (name) => {
              const root = join("node_modules", name);
              const entries = await readdir(root, { recursive: true });
              return Promise.all(
                entries
                  .filter(
                    (path) =>
                      path.endsWith(".d.ts") &&
                      !path.startsWith("node_modules/") &&
                      (name !== "antd" || path.startsWith("es/") || path === "index.d.ts"),
                  )
                  .map(async (path) => ({
                    filePath: `file:///prototype/node_modules/${name}/${path}`,
                    content: await readFile(join(root, path), "utf8"),
                  })),
              );
            }),
          );
          return "export default " + JSON.stringify(files.flat());
        }
        if (id !== "\0virtual:preview-vendor") return;
        const { outputFiles } = await build({
          entryPoints: ["src/preview/vendor.ts"],
          outfile: "preview.js",
          bundle: true,
          write: false,
          minify: true,
          legalComments: "inline",
          define: { "process.env.NODE_ENV": '"production"' },
        });
        const script = outputFiles.find((file) => file.path.endsWith(".js"))?.text;
        const css = outputFiles.find((file) => file.path.endsWith(".css"))?.text;
        return "export default " + JSON.stringify({ script, css });
      },
    },
  ],
  server: { proxy: { "/api": "http://127.0.0.1:8787" } },
});
