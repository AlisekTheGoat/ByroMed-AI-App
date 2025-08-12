import { build, context } from "esbuild";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, format, resolve } from "node:path";
import fs from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isProd = process.argv.includes("--prod");
const outdir = resolve(__dirname, "../dist");

if (!fs.existsSync(outdir)) fs.mkdirSync(outdir, { recursive: true });

// copy static index.html
fs.mkdirSync(resolve(outdir, "renderer"), { recursive: true });
fs.copyFileSync(
  resolve(__dirname, "../src/renderer/index.html"),
  resolve(outdir, "renderer/index.html")
);

// Tailwind CSS build (simple spawn; in dev doporučím ručně spustit `npx tailwindcss -i styles/index.css -o dist/renderer/index.css --watch`)
const buildCss = () =>
  spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    [
      "tailwindcss",
      "-i",
      "./styles/index.css",
      "-o",
      "./dist/renderer/index.css",
      ...(isProd ? ["--minify"] : []),
    ],
    { stdio: "inherit" }
  );

async function bundle() {
  const shared = {
    bundle: true,
    sourcemap: !isProd,
    target: "es2020",
    logLevel: "info",
  };

  const main = {
    ...shared,
    platform: "node",
    format: "cjs",
    entryPoints: ["./electron/main.ts"],
    outfile: "./dist/electron/main.js",
    external: ["electron"],
  };

  const preload = {
    ...shared,
    platform: "node",
    format: "cjs",
    entryPoints: ["./electron/preload.ts"],
    outfile: "./dist/electron/preload.js",
    external: ["electron"],
  };

  const renderer = {
    ...shared,
    platform: "browser",
    entryPoints: ["./src/renderer/main.tsx"],
    outfile: "./dist/renderer/bundle.js",
  };

  if (isProd) {
    await build(main);
    await build(preload);
    await build(renderer);
    console.log("Build done.");
    process.exit(0);
  } else {
    const [ctxMain, ctxPreload, ctxRenderer] = await Promise.all([
      context(main),
      context(preload),
      context(renderer),
    ]);

    await Promise.all([
      ctxMain.watch(),
      ctxPreload.watch(),
      ctxRenderer.watch(),
    ]);
    console.log("Watching...");

    const css = buildCss();
    let electron;

    const startElectron = () => {
      if (electron) {
        electron.kill("SIGTERM");
        electron = null;
      }
      electron = spawn(
        process.platform === "win32" ? "npx.cmd" : "npx",
        ["electron", "."],
        {
          stdio: "inherit",
          env: { ...process.env, NODE_ENV: "development" },
        }
      );
    };

    let readyCount = 0;
    const tryStart = () => {
      if (++readyCount === 2) startElectron();
    };

    ctxMain.onEnd(tryStart);
    ctxPreload.onEnd(tryStart);
    ctxMain.onEnd(startElectron);
    ctxPreload.onEnd(startElectron);

    process.on("SIGINT", () => {
      css.kill("SIGINT");
      if (electron) electron.kill("SIGINT");
      process.exit(0);
    });
  }
}

bundle();
