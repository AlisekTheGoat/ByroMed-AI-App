import { build, context } from "esbuild";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import fs from "node:fs";

const isProd = process.argv.includes("--prod");

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

async function dev() {
  fs.mkdirSync(resolve("dist/electron"), { recursive: true });

  const [ctxMain, ctxPreload] = await Promise.all([
    context(main),
    context(preload),
  ]);
  await Promise.all([ctxMain.watch(), ctxPreload.watch()]);

  let electron;
  const startElectron = () => {
    if (electron) electron.kill("SIGTERM");
    electron = spawn(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["electron", "."],
      {
        stdio: "inherit",
        env: { ...process.env, NODE_ENV: "development" },
      }
    );
  };

  let ready = 0;
  const tryStart = () => {
    if (++ready === 2) startElectron();
  };
  ctxMain.onEnd(tryStart);
  ctxPreload.onEnd(tryStart);

  // Restart při změně main/preload
  ctxMain.onEnd(startElectron);
  ctxPreload.onEnd(startElectron);

  process.on("SIGINT", () => {
    if (electron) electron.kill("SIGINT");
    process.exit(0);
  });
}

async function prod() {
  await build(main);
  await build(preload);
  console.log("Esbuild (main/preload) done.");
}

isProd ? prod() : dev();
