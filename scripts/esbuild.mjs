// scripts/esbuild.mjs
import { build } from "esbuild";
import { spawn } from "node:child_process";
import chokidar from "chokidar";
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

async function buildAll() {
  fs.mkdirSync(resolve("dist/electron"), { recursive: true });
  await build(main);
  await build(preload);
}

let electron;

/** Spustí/restartne Electron */
function restartElectron() {
  if (electron) electron.kill("SIGTERM");
  electron = spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["electron", "."],
    {
      stdio: "inherit",
      env: { ...process.env, NODE_ENV: "development" },
    }
  );
}

async function dev() {
  await buildAll(); // 1) první build
  restartElectron(); // 2) spustit Electron

  // 3) sledujeme TS zdroje, rebuild + restart Electronu
  const srcWatcher = chokidar.watch(["electron/**/*.ts"], {
    ignoreInitial: true,
  });
  srcWatcher.on("change", async () => {
    try {
      await buildAll();
      restartElectron();
    } catch (e) {
      console.error("[esbuild] build error", e);
    }
  });

  // Pro jistotu sleduj i samotné výstupy (kdyby něco jiného přepsalo dist)
  const outWatcher = chokidar.watch(
    ["dist/electron/main.js", "dist/electron/preload.js"],
    { ignoreInitial: true }
  );
  outWatcher.on("change", () => restartElectron());

  process.on("SIGINT", () => {
    srcWatcher.close();
    outWatcher.close();
    if (electron) electron.kill("SIGINT");
    process.exit(0);
  });
}

async function prod() {
  await buildAll();
  console.log("Esbuild (main/preload) done.");
}

isProd ? prod() : dev();
