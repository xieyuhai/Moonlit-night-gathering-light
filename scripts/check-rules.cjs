#!/usr/bin/env node
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "moonlit-rules-"));
try {
    const compiler = process.env.TSC_BIN || "tsc";
    const build = spawnSync(compiler, ["-p", path.join(root, "tsconfig.json"),
        "--module", "commonjs", "--outDir", temporary, "--sourceMap", "false",
        "--noEmitHelpers", "false"], { stdio: "inherit" });
    if (build.error || build.status !== 0) throw new Error("TypeScript 编译失败");
    const { GameViewModel } = require(path.join(temporary, "viewmodel", "GameViewModel.js"));
    const { ScoreRepository } = require(path.join(temporary, "repository", "ScoreRepository.js"));

    const saved = [];
    const vm = new GameViewModel({ readBest: () => 40, saveBest: value => saved.push(value) });
    let state;
    vm.subscribe(value => { state = value; });
    assert.equal(state.phase, "ready");
    assert.equal(state.best, 40);
    vm.start();
    assert.equal(state.phase, "playing");
    const entity = (kind, x = 360, y = 980) => ({ id: 1, kind, x, y, radius: 20,
        speed: 0, rotation: 0, spin: 0 });
    vm.entities = [entity("firefly")];
    vm.update(0.016, 0, 0);
    assert.equal(state.score, 10);
    vm.entities = [entity("firefly")];
    vm.update(0.016, 0, 0);
    assert.equal(state.score, 30);
    assert.equal(state.combo, 2);

    vm.invulnerable = 0;
    vm.entities = [entity("thorn")];
    vm.update(0.016, 0, 0);
    assert.equal(state.hearts, 2);
    assert.equal(state.combo, 0);
    vm.entities = [entity("thorn", 400, 950), entity("firefly", 390, 900)];
    vm.pulse();
    assert.equal(state.entities.length, 0);
    assert.ok(state.score > 30);
    assert.ok(state.pulseReady < 1);

    vm.togglePause();
    const pausedTime = state.elapsed;
    vm.update(1, 0, 0);
    assert.equal(state.phase, "paused");
    assert.equal(state.elapsed, pausedTime);
    vm.start();
    assert.equal(state.phase, "playing");
    vm.elapsed = 59.99;
    vm.update(0.02, 0, 0);
    assert.equal(state.phase, "won");
    assert.equal(saved.at(-1), state.best);

    const lost = new GameViewModel({ readBest: () => 0, saveBest: () => {} });
    let lostState;
    lost.subscribe(value => { lostState = value; });
    lost.start();
    lost.hearts = 1;
    lost.invulnerable = 0;
    lost.entities = [entity("thorn")];
    lost.update(0.016, 0, 0);
    assert.equal(lostState.phase, "lost");

    const memory = new Map();
    global.localStorage = {
        getItem: key => memory.get(key) ?? null,
        setItem: (key, value) => memory.set(key, value)
    };
    const repository = new ScoreRepository();
    assert.equal(repository.readBest(), 0);
    repository.saveBest(123);
    assert.equal(repository.readBest(), 123);
    delete global.localStorage;
    const wechatMemory = new Map();
    global.wx = {
        getStorageSync: key => wechatMemory.get(key),
        setStorageSync: (key, value) => wechatMemory.set(key, value)
    };
    const wechatRepository = new ScoreRepository();
    assert.equal(wechatRepository.readBest(), 0);
    wechatRepository.saveBest(456);
    assert.equal(wechatRepository.readBest(), 456);
    delete global.wx;
    process.stdout.write("规则检查通过：计分、连拾、碰撞、月光波、暂停、结算与最高分。\n");
} finally {
    fs.rmSync(temporary, { recursive: true, force: true });
}
