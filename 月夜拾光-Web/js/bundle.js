"use strict";
(function () {
const definitions = Object.create(null);
const modules = Object.create(null);
function define(id, dependencies, factory) { definitions[id] = { dependencies, factory }; }
function requireModule(id) {
  if (modules[id]) return modules[id];
  const definition = definitions[id];
  if (!definition) throw new Error("Missing module: " + id);
  const exports = modules[id] = {};
  const args = definition.dependencies.map(name => name === "exports" ? exports : name === "require" ? requireModule : requireModule(name));
  definition.factory.apply(null, args);
  return exports;
}
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
define("model/GameModels", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
});
define("repository/ScoreRepository", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ScoreRepository = void 0;
    class ScoreRepository {
        constructor() {
            this.key = "moonlit-garden.best.v1";
        }
        readBest() {
            try {
                const wxStorage = this.wechatStorage();
                const value = Number(wxStorage ? wxStorage.getStorageSync(this.key) : localStorage.getItem(this.key));
                return Number.isFinite(value) && value > 0 ? value : 0;
            }
            catch (_a) {
                return 0;
            }
        }
        saveBest(score) {
            try {
                const wxStorage = this.wechatStorage();
                if (wxStorage)
                    wxStorage.setStorageSync(this.key, score);
                else
                    localStorage.setItem(this.key, String(score));
            }
            catch ( /* Storage is optional. */_a) { /* Storage is optional. */ }
        }
        wechatStorage() {
            return globalThis.wx;
        }
    }
    exports.ScoreRepository = ScoreRepository;
});
define("viewmodel/GameViewModel", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.GameViewModel = void 0;
    const DURATION = 60;
    class GameViewModel {
        constructor(scores) {
            this.scores = scores;
            this.phase = "ready";
            this.score = 0;
            this.hearts = 3;
            this.combo = 0;
            this.comboTimer = 0;
            this.elapsed = 0;
            this.spawnTimer = 0;
            this.pulseCooldown = 0;
            this.pulseWave = 0;
            this.invulnerable = 0;
            this.playerX = 360;
            this.playerY = 980;
            this.targetX = 360;
            this.targetY = 980;
            this.entities = [];
            this.particles = [];
            this.nextId = 0;
            this.listener = () => { };
            this.best = scores.readBest();
        }
        subscribe(listener) {
            this.listener = listener;
            this.emit();
        }
        start() {
            if (this.phase === "playing")
                return;
            if (this.phase === "paused") {
                this.phase = "playing";
                this.emit();
                return;
            }
            this.phase = "playing";
            this.score = 0;
            this.hearts = 3;
            this.combo = 0;
            this.comboTimer = 0;
            this.elapsed = 0;
            this.spawnTimer = 0.25;
            this.pulseCooldown = 0;
            this.pulseWave = 0;
            this.invulnerable = 1.5;
            this.playerX = this.targetX = 360;
            this.playerY = this.targetY = 980;
            this.entities = [];
            this.particles = [];
            this.emit();
        }
        togglePause() {
            if (this.phase === "playing")
                this.phase = "paused";
            else if (this.phase === "paused")
                this.phase = "playing";
            else
                return;
            this.emit();
        }
        pause() {
            if (this.phase === "playing") {
                this.phase = "paused";
                this.emit();
            }
        }
        setTarget(x, y) {
            if (this.phase !== "playing")
                return;
            this.targetX = Math.max(58, Math.min(662, x));
            this.targetY = Math.max(250, Math.min(1045, y));
        }
        pulse() {
            if (this.phase !== "playing" || this.pulseCooldown > 0)
                return;
            this.pulseCooldown = 7;
            this.pulseWave = 0.65;
            let cleared = 0;
            this.entities = this.entities.filter(entity => {
                if (Math.hypot(entity.x - this.playerX, entity.y - this.playerY) >= 245)
                    return true;
                if (entity.kind === "thorn") {
                    cleared++;
                    this.burst(entity.x, entity.y, "#bf7ca7", 10);
                }
                else if (entity.kind === "firefly")
                    this.collectFirefly(entity.x, entity.y);
                else {
                    this.hearts = Math.min(3, this.hearts + 1);
                    this.burst(entity.x, entity.y, "#f2a8b7", 10);
                }
                return false;
            });
            this.score += cleared * 5;
            this.burst(this.playerX, this.playerY, "#ecdea4", 20);
            this.emit();
        }
        update(dt, horizontal, vertical) {
            if (this.phase !== "playing")
                return;
            this.elapsed += dt;
            if (this.elapsed >= DURATION) {
                this.elapsed = DURATION;
                this.finish("won");
                return;
            }
            this.comboTimer = Math.max(0, this.comboTimer - dt);
            if (this.comboTimer === 0)
                this.combo = 0;
            this.pulseCooldown = Math.max(0, this.pulseCooldown - dt);
            this.pulseWave = Math.max(0, this.pulseWave - dt);
            this.invulnerable = Math.max(0, this.invulnerable - dt);
            if (horizontal || vertical) {
                const length = Math.hypot(horizontal, vertical);
                this.playerX += horizontal / length * 440 * dt;
                this.playerY += vertical / length * 440 * dt;
                this.targetX = this.playerX;
                this.targetY = this.playerY;
            }
            else {
                const smoothing = Math.min(1, dt * 11);
                this.playerX += (this.targetX - this.playerX) * smoothing;
                this.playerY += (this.targetY - this.playerY) * smoothing;
            }
            this.playerX = Math.max(58, Math.min(662, this.playerX));
            this.playerY = Math.max(250, Math.min(1045, this.playerY));
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                this.spawn();
                this.spawnTimer = Math.max(0.24, 0.57 - this.elapsed * 0.0045) * (0.78 + Math.random() * 0.44);
            }
            const active = [];
            for (const entity of this.entities) {
                entity.y += entity.speed * dt;
                entity.rotation += entity.spin * dt;
                if (entity.y > 1060)
                    continue;
                const distance = Math.hypot(entity.x - this.playerX, entity.y - this.playerY);
                if (distance < entity.radius + 24) {
                    if (entity.kind === "firefly")
                        this.collectFirefly(entity.x, entity.y);
                    else if (entity.kind === "blossom") {
                        this.hearts = Math.min(3, this.hearts + 1);
                        this.burst(entity.x, entity.y, "#f2a8b7", 12);
                    }
                    else if (this.invulnerable <= 0) {
                        this.hearts--;
                        this.combo = 0;
                        this.invulnerable = 1.5;
                        this.burst(entity.x, entity.y, "#c68baa", 18);
                        if (this.hearts <= 0) {
                            this.finish("lost");
                            return;
                        }
                    }
                    else
                        active.push(entity);
                }
                else
                    active.push(entity);
            }
            this.entities = active;
            this.particles = this.particles.filter(p => {
                p.life -= dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                return p.life > 0;
            });
            this.emit();
        }
        spawn() {
            const roll = Math.random();
            const kind = roll < 0.64 ? "firefly" : roll < 0.965 ? "thorn" : "blossom";
            const radius = kind === "thorn" ? 24 + Math.random() * 12 : kind === "blossom" ? 20 : 20;
            this.entities.push({ id: ++this.nextId, kind, x: 55 + Math.random() * 610, y: 265,
                radius, speed: 180 + this.elapsed * 3.2 + Math.random() * 90,
                rotation: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 2.6 });
        }
        collectFirefly(x, y) {
            this.combo = this.comboTimer > 0 ? Math.min(8, this.combo + 1) : 1;
            this.comboTimer = 3;
            this.score += 10 * this.combo;
            this.burst(x, y, "#f8e6a1", 9);
        }
        burst(x, y, color, count) {
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 60 + Math.random() * 170;
                const life = 0.3 + Math.random() * 0.35;
                this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                    life, maxLife: life, color, radius: 2 + Math.random() * 4 });
            }
            if (this.particles.length > 150)
                this.particles.splice(0, this.particles.length - 150);
        }
        finish(phase) {
            this.phase = phase;
            if (this.score > this.best) {
                this.best = this.score;
                this.scores.saveBest(this.best);
            }
            this.emit();
        }
        emit() {
            this.listener({ phase: this.phase, score: this.score, best: this.best,
                hearts: this.hearts, combo: this.combo, secondsLeft: Math.ceil(DURATION - this.elapsed),
                pulseReady: 1 - this.pulseCooldown / 7, pulseWave: this.pulseWave,
                playerX: this.playerX, playerY: this.playerY, invulnerable: this.invulnerable,
                entities: this.entities, particles: this.particles, elapsed: this.elapsed });
        }
    }
    exports.GameViewModel = GameViewModel;
});
define("config/zh_CN", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.zhCN = void 0;
    exports.zhCN = {
        title: "月夜拾光",
        englishTitle: "MOONLIT GARDEN",
        subtitle: "把散落的微光，带回月亮身边",
        start: "开始拾光",
        again: "再游一次",
        resume: "继续漫游",
        pause: "暂停",
        readyTip: "收集萤火  ·  避开暗荆  ·  点亮花朵",
        controlTip: "拖动光灵移动  ·  点击月光波驱散暗荆",
        keyboardTip: "电脑可用 WASD / 方向键移动，空格释放月光波",
        pulse: "月光波",
        pulseReady: "已充能",
        score: "微光",
        best: "最佳",
        time: "时间",
        combo: "连拾",
        won: "月色正好",
        lost: "光还会再来",
        pauseTitle: "月夜暂歇",
        wonTip: "你守护了这座发光的花园",
        lostTip: "再走一程，月光仍在等你",
        goal: "坚持 60 秒，收集更多微光",
        hearts: "花瓣",
        scoreUnit: "分",
        secondsUnit: "秒",
        brand: "A LITTLE NIGHT ADVENTURE",
        badge: "01 / 花园之夜"
    };
});
define("page/GamePage", ["require", "exports", "config/zh_CN"], function (require, exports, zh_CN_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.GamePage = void 0;
    const C = {
        night: "#071c28", deep: "#092a32", garden: "#103d43", teal: "#2c6260",
        leaf: "#56856e", leafLight: "#82a87e", gold: "#f3dda0", white: "#fff9dd",
        muted: "#a6c3b8", rose: "#e6a8b6", thorn: "#83647e"
    };
    class GamePage {
        constructor(scene, actions) {
            this.scene = scene;
            this.actions = actions;
            this.background = new Laya.Sprite();
            this.world = new Laya.Sprite();
            this.hud = new Laya.Sprite();
            this.overlay = new Laya.Sprite();
            this.scoreText = this.text("0", 52, 81, 49, C.white, true, 220);
            this.bestText = this.text("0", 313, 90, 31, C.gold, true, 160);
            this.timerText = this.text("60", 561, 82, 48, C.white, true, 110);
            this.comboText = this.text("", 253, 175, 29, C.gold, true, 220, "center");
            this.heartText = this.text("", 48, 176, 33, C.rose, true, 250);
            this.pulseLabel = this.text(zh_CN_1.zhCN.pulse, 0, 76, 24, C.night, true, 130, "center");
            this.overlayTitle = this.text(zh_CN_1.zhCN.title, 70, 450, 76, C.white, true, 580, "center");
            this.overlaySubtitle = this.text(zh_CN_1.zhCN.subtitle, 70, 551, 28, C.muted, false, 580, "center");
            this.overlayScore = this.text(zh_CN_1.zhCN.goal, 75, 713, 27, C.gold, false, 570, "center");
            this.actionText = this.text(zh_CN_1.zhCN.start, 0, 22, 34, C.night, true, 484, "center");
            this.startButton = new Laya.Sprite();
            this.pauseButton = new Laya.Sprite();
            this.pulseButton = new Laya.Sprite();
            this.overlayPanel = new Laya.Sprite();
            this.lastPhase = "";
            this.dragging = false;
            scene.addChild(this.background);
            scene.addChild(this.world);
            scene.addChild(this.hud);
            scene.addChild(this.overlay);
            this.drawBackground();
            this.buildHud();
            this.buildOverlay();
            Laya.stage.on(Laya.Event.MOUSE_DOWN, this, this.onPointerDown);
            Laya.stage.on(Laya.Event.MOUSE_MOVE, this, this.onPointerMove);
            Laya.stage.on(Laya.Event.MOUSE_UP, this, this.onPointerUp);
            Laya.stage.on(Laya.Event.MOUSE_OUT, this, this.onPointerUp);
        }
        dispose() {
            Laya.stage.off(Laya.Event.MOUSE_DOWN, this, this.onPointerDown);
            Laya.stage.off(Laya.Event.MOUSE_MOVE, this, this.onPointerMove);
            Laya.stage.off(Laya.Event.MOUSE_UP, this, this.onPointerUp);
            Laya.stage.off(Laya.Event.MOUSE_OUT, this, this.onPointerUp);
        }
        render(state) {
            this.drawWorld(state);
            this.scoreText.text = String(state.score);
            this.bestText.text = String(Math.max(state.best, state.score));
            this.timerText.text = String(state.secondsLeft).padStart(2, "0");
            this.heartText.text = "♥ ".repeat(state.hearts) + "♡ ".repeat(3 - state.hearts);
            this.comboText.text = state.combo > 1 ? `${zh_CN_1.zhCN.combo} ×${state.combo}` : "";
            this.pulseLabel.text = state.pulseReady >= 1 ? zh_CN_1.zhCN.pulse : `${Math.ceil((1 - state.pulseReady) * 7)}${zh_CN_1.zhCN.secondsUnit}`;
            this.drawPulseButton(state.pulseReady);
            this.overlay.visible = state.phase !== "playing";
            this.pauseButton.visible = state.phase === "playing";
            if (state.phase !== this.lastPhase)
                this.drawOverlay(state);
            if (state.phase === "won" || state.phase === "lost") {
                this.overlayScore.text = `${zh_CN_1.zhCN.score} ${state.score}${zh_CN_1.zhCN.scoreUnit}     ${zh_CN_1.zhCN.best} ${state.best}${zh_CN_1.zhCN.scoreUnit}`;
            }
            this.lastPhase = state.phase;
        }
        onPointerDown() {
            this.dragging = true;
            this.moveToPointer();
        }
        onPointerMove() {
            if (this.dragging)
                this.moveToPointer();
        }
        onPointerUp() {
            this.dragging = false;
        }
        moveToPointer() {
            const y = Laya.stage.mouseY;
            if (y >= 235 && y <= 1080)
                this.actions.move(Laya.stage.mouseX, y);
        }
        drawBackground() {
            const g = this.background.graphics;
            g.drawRect(0, 0, 720, 1280, C.night);
            g.drawRect(0, 204, 720, 902, C.deep);
            g.drawCircle(562, 365, 250, "#0c343b");
            g.drawCircle(562, 365, 178, "#123d42");
            g.drawCircle(560, 352, 104, "#1d4b4c");
            g.drawCircle(560, 352, 64, "#e9dcae");
            g.drawCircle(586, 334, 57, "#f8ecc2");
            g.drawCircle(558, 344, 16, "#e9dcae");
            g.drawCircle(602, 377, 10, "#e8daa8");
            for (let i = 0; i < 52; i++) {
                const x = 31 + (i * 139.7) % 660;
                const y = 230 + (i * 229.1) % 830;
                g.drawCircle(x, y, i % 5 === 0 ? 2 : 1, i % 3 === 0 ? "#779e8d" : "#48756c");
            }
            this.drawVines(g);
            g.drawRect(0, 1078, 720, 202, "#0b2b30");
            for (let i = 0; i < 21; i++) {
                const x = i * 38 - 10;
                const height = 40 + (i * 29) % 52;
                g.drawPoly(x, 1110, [0, 0, 14, -height, 26, 0], i % 2 ? "#174941" : "#1e5549");
            }
            g.drawLine(34, 209, 686, 209, "#50766b", 2);
            g.drawLine(34, 1105, 686, 1105, "#50766b", 2);
            g.drawRoundRect(25, 18, 670, 171, 24, 24, 24, 24, "#113239", "#457168", 2);
            g.drawRoundRect(25, 1124, 670, 131, 24, 24, 24, 24, "#113239", "#457168", 2);
        }
        drawVines(g) {
            g.drawLine(13, 225, 43, 1080, "#29594d", 9);
            g.drawLine(709, 226, 669, 1080, "#29594d", 9);
            for (let i = 0; i < 16; i++) {
                const y = 260 + i * 52;
                const side = i % 2 === 0 ? 1 : -1;
                this.leaf(g, 22 + side * 4, y, 41, side, i % 3 === 0 ? C.leafLight : C.leaf);
                this.leaf(g, 698 - side * 4, y + 19, 41, -side, i % 3 === 1 ? C.leafLight : C.leaf);
            }
            for (let i = 0; i < 11; i++) {
                const x = 46 + i * 63;
                const y = 1058 + (i * 23) % 34;
                this.leaf(g, x, y, 32, i % 2 ? -1 : 1, i % 3 ? C.leaf : C.leafLight);
            }
        }
        leaf(g, x, y, length, direction, color) {
            g.drawPoly(x, y, [0, 0, direction * length * 0.48, -length * 0.59,
                direction * length, -length * 0.38, direction * length * 0.57, -length * 0.08], color);
            g.drawLine(x, y, x + direction * length * 0.8, y - length * 0.35, "#2b5d50", 1);
        }
        buildHud() {
            this.hud.addChild(this.text(zh_CN_1.zhCN.score, 53, 41, 21, C.muted, true, 180));
            this.hud.addChild(this.scoreText);
            this.hud.addChild(this.text(zh_CN_1.zhCN.best, 315, 42, 21, C.muted, true, 150));
            this.hud.addChild(this.bestText);
            this.hud.addChild(this.text(zh_CN_1.zhCN.time, 566, 42, 21, C.muted, true, 110));
            this.hud.addChild(this.timerText);
            this.hud.addChild(this.heartText);
            this.hud.addChild(this.comboText);
            this.hud.addChild(this.text(zh_CN_1.zhCN.controlTip, 51, 1164, 20, C.muted, false, 445));
            this.pauseButton.pos(602, 145);
            this.pauseButton.size(67, 37);
            this.pauseButton.graphics.drawRoundRect(0, 0, 67, 37, 15, 15, 15, 15, "#285751");
            this.pauseButton.addChild(this.text("Ⅱ", 0, 0, 24, C.white, true, 67, "center"));
            this.pauseButton.on(Laya.Event.CLICK, this, () => this.actions.pause());
            this.hud.addChild(this.pauseButton);
            this.pulseButton.pos(535, 1130);
            this.pulseButton.size(120, 120);
            this.pulseButton.addChild(this.pulseLabel);
            this.pulseButton.on(Laya.Event.CLICK, this, (event) => {
                event.stopPropagation();
                this.actions.pulse();
            });
            this.hud.addChild(this.pulseButton);
        }
        drawPulseButton(ready) {
            const g = this.pulseButton.graphics;
            g.clear();
            g.drawCircle(60, 60, 59, ready >= 1 ? C.gold : "#45635a", C.gold, 2);
            g.drawCircle(60, 60, 50, ready >= 1 ? "#f7e7b3" : "#2b524d");
            if (ready < 1)
                g.drawPie(60, 60, 43, -90, -90 + ready * 360, "#819b72");
            g.drawCircle(60, 43, 13, ready >= 1 ? C.night : C.gold);
            g.drawCircle(66, 38, 13, ready >= 1 ? "#f7e7b3" : "#2b524d");
        }
        buildOverlay() {
            const shade = new Laya.Sprite();
            shade.graphics.drawRect(0, 0, 720, 1280, "#06171f");
            shade.alpha = 0.78;
            this.overlay.addChild(shade);
            this.overlayPanel.graphics.drawRoundRect(49, 287, 622, 748, 39, 39, 39, 39, "#123a40", "#7da38a", 3);
            this.overlayPanel.graphics.drawRoundRect(63, 301, 594, 720, 31, 31, 31, 31, "#173e43", "#406f63", 1);
            this.overlayPanel.graphics.drawLine(112, 625, 608, 625, "#648276", 2);
            this.overlayPanel.graphics.drawCircle(360, 381, 70, "#315b58");
            this.overlayPanel.graphics.drawCircle(360, 381, 52, "#e7d8aa");
            this.overlayPanel.graphics.drawCircle(384, 362, 44, "#f7eabf");
            this.overlayPanel.graphics.drawCircle(324, 402, 5, C.gold);
            this.overlayPanel.graphics.drawCircle(405, 405, 4, C.gold);
            this.overlayPanel.addChild(this.overlayTitle);
            this.overlayPanel.addChild(this.overlaySubtitle);
            this.overlayPanel.addChild(this.text(zh_CN_1.zhCN.englishTitle, 100, 524, 17, C.gold, true, 520, "center"));
            this.overlayPanel.addChild(this.text(zh_CN_1.zhCN.readyTip, 75, 666, 23, C.white, false, 570, "center"));
            this.overlayPanel.addChild(this.overlayScore);
            this.startButton.pos(118, 812);
            this.startButton.size(484, 88);
            this.startButton.graphics.drawRoundRect(0, 0, 484, 88, 30, 30, 30, 30, "#f1dfa8", "#fff6d8", 2);
            this.startButton.addChild(this.actionText);
            this.startButton.on(Laya.Event.CLICK, this, () => this.actions.start());
            this.overlayPanel.addChild(this.startButton);
            this.overlayPanel.addChild(this.text(zh_CN_1.zhCN.keyboardTip, 74, 946, 18, C.muted, false, 572, "center"));
            this.overlay.addChild(this.overlayPanel);
            this.overlay.addChild(this.text(zh_CN_1.zhCN.brand, 100, 1186, 16, C.muted, true, 520, "center"));
        }
        drawOverlay(state) {
            if (state.phase === "ready") {
                this.overlayTitle.text = zh_CN_1.zhCN.title;
                this.overlaySubtitle.text = zh_CN_1.zhCN.subtitle;
                this.overlayScore.text = zh_CN_1.zhCN.goal;
                this.actionText.text = zh_CN_1.zhCN.start;
            }
            else if (state.phase === "paused") {
                this.overlayTitle.text = zh_CN_1.zhCN.pauseTitle;
                this.overlaySubtitle.text = zh_CN_1.zhCN.subtitle;
                this.overlayScore.text = `${zh_CN_1.zhCN.score} ${state.score}${zh_CN_1.zhCN.scoreUnit}`;
                this.actionText.text = zh_CN_1.zhCN.resume;
            }
            else {
                this.overlayTitle.text = state.phase === "won" ? zh_CN_1.zhCN.won : zh_CN_1.zhCN.lost;
                this.overlaySubtitle.text = state.phase === "won" ? zh_CN_1.zhCN.wonTip : zh_CN_1.zhCN.lostTip;
                this.actionText.text = zh_CN_1.zhCN.again;
            }
        }
        drawWorld(state) {
            const g = this.world.graphics;
            g.clear();
            for (const entity of state.entities)
                this.drawEntity(entity, state.elapsed);
            for (const particle of state.particles) {
                g.drawCircle(particle.x, particle.y, Math.max(1, particle.radius * particle.life / particle.maxLife), particle.color);
            }
            if (state.pulseWave > 0) {
                const progress = 1 - state.pulseWave / 0.65;
                g.drawCircle(state.playerX, state.playerY, 50 + progress * 205, null, C.gold, 6 * (1 - progress) + 1);
                g.drawCircle(state.playerX, state.playerY, 38 + progress * 185, null, C.white, 2);
            }
            if (state.phase !== "ready")
                this.drawPlayer(state.playerX, state.playerY, state.elapsed, state.invulnerable);
        }
        drawEntity(entity, elapsed) {
            const g = this.world.graphics;
            if (entity.kind === "firefly") {
                const flicker = Math.sin(elapsed * 9 + entity.id) * 3;
                g.drawCircle(entity.x, entity.y, 34 + flicker, "#315c54");
                g.drawCircle(entity.x, entity.y, 23 + flicker, "#9baf7c");
                g.drawPoly(entity.x, entity.y, [-7, 0, -22, -10, -17, 7, -6, 8], "#d2d59a");
                g.drawPoly(entity.x, entity.y, [7, 0, 22, -10, 17, 7, 6, 8], "#d2d59a");
                g.drawCircle(entity.x, entity.y, 11, C.gold);
                g.drawCircle(entity.x - 3, entity.y - 4, 4, C.white);
            }
            else if (entity.kind === "blossom") {
                g.drawCircle(entity.x, entity.y, 30, "#385b59");
                for (let i = 0; i < 5; i++) {
                    const a = entity.rotation + i * Math.PI * 2 / 5;
                    const px = entity.x + Math.cos(a) * 13;
                    const py = entity.y + Math.sin(a) * 13;
                    g.drawCircle(px, py, 11, i % 2 ? "#d99aac" : "#f1b9bb");
                }
                g.drawCircle(entity.x, entity.y, 10, C.gold);
                g.drawCircle(entity.x - 3, entity.y - 3, 3, C.white);
            }
            else {
                g.drawCircle(entity.x, entity.y, entity.radius + 8, "#34434b");
                g.drawPoly(entity.x, entity.y, this.thornPoints(entity.radius, entity.rotation), "#604a66", C.thorn, 2);
                g.drawCircle(entity.x - 5, entity.y - 4, 7, "#9b7593");
                g.drawCircle(entity.x + 9, entity.y + 7, 4, "#302f49");
            }
        }
        drawPlayer(x, y, time, invulnerable) {
            const g = this.world.graphics;
            const bob = Math.sin(time * 6) * 4;
            g.drawCircle(x, y, 57, "#23504e");
            g.drawCircle(x, y, 43, "#5a7e68");
            if (invulnerable > 0)
                g.drawCircle(x, y, 56, null, C.gold, 3);
            g.drawPoly(x, y + bob, [-7, 0, -35, -19, -36, 11, -13, 17], "#9fbd91", "#d8dda6", 2);
            g.drawPoly(x, y + bob, [7, 0, 35, -19, 36, 11, 13, 17], "#9fbd91", "#d8dda6", 2);
            g.drawCircle(x, y + bob, 22, "#e9da9b", C.white, 2);
            g.drawCircle(x - 7, y + bob - 3, 2, C.night);
            g.drawCircle(x + 7, y + bob - 3, 2, C.night);
            g.drawCircle(x - 14, y + bob + 6, 3, C.rose);
            g.drawCircle(x + 14, y + bob + 6, 3, C.rose);
            g.drawPoly(x, y + bob - 18, [0, 0, -9, -18, 1, -10, 11, -18], C.leafLight);
        }
        thornPoints(radius, rotation) {
            const points = [];
            for (let i = 0; i < 16; i++) {
                const angle = rotation + i * Math.PI / 8;
                const r = i % 2 === 0 ? radius : radius * 0.72;
                points.push(Math.cos(angle) * r, Math.sin(angle) * r);
            }
            return points;
        }
        text(value, x, y, size, color, bold = false, width = 180, align = "left") {
            const label = new Laya.Text();
            label.text = value;
            label.pos(x, y);
            label.size(width, size + 17);
            label.font = "PingFang SC, Songti SC, sans-serif";
            label.fontSize = size;
            label.color = color;
            label.bold = bold;
            label.align = align;
            return label;
        }
    }
    exports.GamePage = GamePage;
});
define("Main", ["require", "exports", "viewmodel/GameViewModel", "repository/ScoreRepository", "page/GamePage"], function (require, exports, GameViewModel_1, ScoreRepository_1, GamePage_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Main = void 0;
    const { regClass } = Laya;
    let Main = class Main extends Laya.Script {
        constructor() {
            super(...arguments);
            this.keys = new Set();
            this.handleVisibilityChange = () => {
                if (document.hidden)
                    this.viewModel.pause();
            };
            this.handleWechatHide = () => this.viewModel.pause();
        }
        onStart() {
            var _a;
            Laya.stage.designWidth = 720;
            Laya.stage.designHeight = 1280;
            Laya.stage.scaleMode = Laya.Stage.SCALE_SHOWALL;
            Laya.stage.alignH = Laya.Stage.ALIGN_CENTER;
            Laya.stage.alignV = Laya.Stage.ALIGN_MIDDLE;
            Laya.stage.bgColor = "#071c28";
            Laya.stage.updateCanvasSize();
            this.viewModel = new GameViewModel_1.GameViewModel(new ScoreRepository_1.ScoreRepository());
            this.page = new GamePage_1.GamePage(this.owner, {
                start: () => this.viewModel.start(),
                pause: () => this.viewModel.togglePause(),
                pulse: () => this.viewModel.pulse(),
                move: (x, y) => this.viewModel.setTarget(x, y)
            });
            this.viewModel.subscribe(state => this.page.render(state));
            Laya.stage.on(Laya.Event.KEY_DOWN, this, this.handleKeyDown);
            Laya.stage.on(Laya.Event.KEY_UP, this, this.handleKeyUp);
            if (typeof document !== "undefined")
                document.addEventListener("visibilitychange", this.handleVisibilityChange);
            (_a = this.wechatLifecycle()) === null || _a === void 0 ? void 0 : _a.onHide(this.handleWechatHide);
            Laya.timer.frameLoop(1, this, this.tick);
        }
        handleKeyDown(event) {
            const key = String(event.key || "").toLowerCase();
            if (key === " " || key === "space")
                this.viewModel.pulse();
            else if (key === "escape" || key === "p")
                this.viewModel.togglePause();
            else if (key === "enter")
                this.viewModel.start();
            this.keys.add(key);
        }
        handleKeyUp(event) {
            this.keys.delete(String(event.key || "").toLowerCase());
        }
        wechatLifecycle() {
            return globalThis.wx;
        }
        tick() {
            const horizontal = Number(this.keys.has("d") || this.keys.has("arrowright")) - Number(this.keys.has("a") || this.keys.has("arrowleft"));
            const vertical = Number(this.keys.has("s") || this.keys.has("arrowdown")) - Number(this.keys.has("w") || this.keys.has("arrowup"));
            this.viewModel.update(Math.min(Laya.timer.delta / 1000, 0.05), horizontal, vertical);
        }
        onDestroy() {
            var _a, _b, _c;
            Laya.timer.clear(this, this.tick);
            Laya.stage.off(Laya.Event.KEY_DOWN, this, this.handleKeyDown);
            Laya.stage.off(Laya.Event.KEY_UP, this, this.handleKeyUp);
            if (typeof document !== "undefined")
                document.removeEventListener("visibilitychange", this.handleVisibilityChange);
            (_b = (_a = this.wechatLifecycle()) === null || _a === void 0 ? void 0 : _a.offHide) === null || _b === void 0 ? void 0 : _b.call(_a, this.handleWechatHide);
            (_c = this.page) === null || _c === void 0 ? void 0 : _c.dispose();
        }
    };
    exports.Main = Main;
    exports.Main = Main = __decorate([
        regClass("e60XQm7tTY2BwFAdxb8D1g")
    ], Main);
});

requireModule("Main");
})();
