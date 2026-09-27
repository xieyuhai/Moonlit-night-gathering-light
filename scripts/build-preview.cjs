#!/usr/bin/env node
// Rebuilds source against an existing LayaAir Web runtime when the IDE CLI is unavailable.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const web = path.join(root, "release", "web");
const runtime = path.join(web, "libs", "laya.core.js");
if (!fs.existsSync(runtime)) {
    process.stderr.write("缺少 LayaAir Web 引擎运行库。请先使用官方 IDE/CLI 构建一次。\n");
    process.exit(1);
}

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "moonlit-build-"));
try {
    const output = path.join(temporary, "game.amd.js");
    const compiler = process.env.TSC_BIN || "tsc";
    const result = spawnSync(compiler, ["-p", path.join(root, "tsconfig.json"),
        "--module", "amd", "--outFile", output, "--sourceMap", "false",
        "--noEmitHelpers", "false"], { stdio: "inherit" });
    if (result.error || result.status !== 0) {
        process.stderr.write("TypeScript 编译失败。请安装 tsc，或通过 TSC_BIN 指定编译器。\n");
        process.exit(1);
    }
    const uuid = JSON.parse(fs.readFileSync(path.join(root, "src", "Main.ts.meta"), "utf8")).uuid;
    const compactId = Buffer.from(uuid.replace(/-/g, ""), "hex").toString("base64").replace(/=+$/, "");
    const amd = fs.readFileSync(output, "utf8").replace("regClass()", `regClass("${compactId}")`);
    const loader = `"use strict";\n(function () {\n` +
        `const definitions = Object.create(null);\nconst modules = Object.create(null);\n` +
        `function define(id, dependencies, factory) { definitions[id] = { dependencies, factory }; }\n` +
        `function requireModule(id) {\n` +
        `  if (modules[id]) return modules[id];\n` +
        `  const definition = definitions[id];\n` +
        `  if (!definition) throw new Error("Missing module: " + id);\n` +
        `  const exports = modules[id] = {};\n` +
        `  const args = definition.dependencies.map(name => name === "exports" ? exports : name === "require" ? requireModule : requireModule(name));\n` +
        `  definition.factory.apply(null, args);\n` +
        `  return exports;\n}\n`;
    fs.writeFileSync(path.join(web, "js", "bundle.js"), loader + amd + `\nrequireModule("Main");\n})();\n`);
    const scene = fs.readFileSync(path.join(root, "assets", "Scene.ls"), "utf8").replaceAll(uuid, compactId);
    fs.writeFileSync(path.join(web, "Scene.ls"), scene);
    const htmlPath = path.join(web, "index.html");
    const appName = JSON.parse(fs.readFileSync(path.join(root, "settings", "BuildSettings.json"), "utf8")).name;
    fs.writeFileSync(htmlPath, fs.readFileSync(htmlPath, "utf8")
        .replace(/<title>[^<]*<\/title>/, `<title>${appName}</title>`)
        .replaceAll("#070d20", "#071c28"));
    const indexPath = path.join(web, "js", "index.js");
    fs.writeFileSync(indexPath, fs.readFileSync(indexPath, "utf8").replaceAll("#070d20", "#071c28"));
    process.stdout.write(`预览构建完成：${web}\n`);
} finally {
    fs.rmSync(temporary, { recursive: true, force: true });
}
