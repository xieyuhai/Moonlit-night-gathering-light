import { FallingEntity, GameUIModel } from "../model/GameModels";
import { zhCN } from "../config/zh_CN";

interface Actions {
    start(): void;
    pause(): void;
    pulse(): void;
    move(x: number, y: number): void;
}

const C = {
    night: "#071c28", deep: "#092a32", garden: "#103d43", teal: "#2c6260",
    leaf: "#56856e", leafLight: "#82a87e", gold: "#f3dda0", white: "#fff9dd",
    muted: "#a6c3b8", rose: "#e6a8b6", thorn: "#83647e"
} as const;

export class GamePage {
    private readonly background = new Laya.Sprite();
    private readonly world = new Laya.Sprite();
    private readonly hud = new Laya.Sprite();
    private readonly overlay = new Laya.Sprite();
    private readonly scoreText = this.text("0", 52, 81, 49, C.white, true, 220);
    private readonly bestText = this.text("0", 313, 90, 31, C.gold, true, 160);
    private readonly timerText = this.text("60", 561, 82, 48, C.white, true, 110);
    private readonly comboText = this.text("", 253, 175, 29, C.gold, true, 220, "center");
    private readonly heartText = this.text("", 48, 176, 33, C.rose, true, 250);
    private readonly pulseLabel = this.text(zhCN.pulse, 0, 76, 24, C.night, true, 130, "center");
    private readonly overlayTitle = this.text(zhCN.title, 70, 450, 76, C.white, true, 580, "center");
    private readonly overlaySubtitle = this.text(zhCN.subtitle, 70, 551, 28, C.muted, false, 580, "center");
    private readonly overlayScore = this.text(zhCN.goal, 75, 713, 27, C.gold, false, 570, "center");
    private readonly actionText = this.text(zhCN.start, 0, 22, 34, C.night, true, 484, "center");
    private readonly startButton = new Laya.Sprite();
    private readonly pauseButton = new Laya.Sprite();
    private readonly pulseButton = new Laya.Sprite();
    private readonly overlayPanel = new Laya.Sprite();
    private lastPhase = "";
    private dragging = false;

    constructor(private readonly scene: Laya.Scene, private readonly actions: Actions) {
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

    dispose(): void {
        Laya.stage.off(Laya.Event.MOUSE_DOWN, this, this.onPointerDown);
        Laya.stage.off(Laya.Event.MOUSE_MOVE, this, this.onPointerMove);
        Laya.stage.off(Laya.Event.MOUSE_UP, this, this.onPointerUp);
        Laya.stage.off(Laya.Event.MOUSE_OUT, this, this.onPointerUp);
    }

    render(state: GameUIModel): void {
        this.drawWorld(state);
        this.scoreText.text = String(state.score);
        this.bestText.text = String(Math.max(state.best, state.score));
        this.timerText.text = String(state.secondsLeft).padStart(2, "0");
        this.heartText.text = "♥ ".repeat(state.hearts) + "♡ ".repeat(3 - state.hearts);
        this.comboText.text = state.combo > 1 ? `${zhCN.combo} ×${state.combo}` : "";
        this.pulseLabel.text = state.pulseReady >= 1 ? zhCN.pulse : `${Math.ceil((1 - state.pulseReady) * 7)}${zhCN.secondsUnit}`;
        this.drawPulseButton(state.pulseReady);
        this.overlay.visible = state.phase !== "playing";
        this.pauseButton.visible = state.phase === "playing";
        if (state.phase !== this.lastPhase) this.drawOverlay(state);
        if (state.phase === "won" || state.phase === "lost") {
            this.overlayScore.text = `${zhCN.score} ${state.score}${zhCN.scoreUnit}     ${zhCN.best} ${state.best}${zhCN.scoreUnit}`;
        }
        this.lastPhase = state.phase;
    }

    private onPointerDown(): void {
        this.dragging = true;
        this.moveToPointer();
    }

    private onPointerMove(): void {
        if (this.dragging) this.moveToPointer();
    }

    private onPointerUp(): void {
        this.dragging = false;
    }

    private moveToPointer(): void {
        const y = Laya.stage.mouseY;
        if (y >= 235 && y <= 1080) this.actions.move(Laya.stage.mouseX, y);
    }

    private drawBackground(): void {
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

    private drawVines(g: Laya.Graphics): void {
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

    private leaf(g: Laya.Graphics, x: number, y: number, length: number, direction: number, color: string): void {
        g.drawPoly(x, y, [0, 0, direction * length * 0.48, -length * 0.59,
            direction * length, -length * 0.38, direction * length * 0.57, -length * 0.08], color);
        g.drawLine(x, y, x + direction * length * 0.8, y - length * 0.35, "#2b5d50", 1);
    }

    private buildHud(): void {
        this.hud.addChild(this.text(zhCN.score, 53, 41, 21, C.muted, true, 180));
        this.hud.addChild(this.scoreText);
        this.hud.addChild(this.text(zhCN.best, 315, 42, 21, C.muted, true, 150));
        this.hud.addChild(this.bestText);
        this.hud.addChild(this.text(zhCN.time, 566, 42, 21, C.muted, true, 110));
        this.hud.addChild(this.timerText);
        this.hud.addChild(this.heartText);
        this.hud.addChild(this.comboText);
        this.hud.addChild(this.text(zhCN.controlTip, 51, 1164, 20, C.muted, false, 445));
        this.pauseButton.pos(602, 145);
        this.pauseButton.size(67, 37);
        this.pauseButton.graphics.drawRoundRect(0, 0, 67, 37, 15, 15, 15, 15, "#285751");
        this.pauseButton.addChild(this.text("Ⅱ", 0, 0, 24, C.white, true, 67, "center"));
        this.pauseButton.on(Laya.Event.CLICK, this, () => this.actions.pause());
        this.hud.addChild(this.pauseButton);
        this.pulseButton.pos(535, 1130);
        this.pulseButton.size(120, 120);
        this.pulseButton.addChild(this.pulseLabel);
        this.pulseButton.on(Laya.Event.CLICK, this, (event: Laya.Event) => {
            event.stopPropagation();
            this.actions.pulse();
        });
        this.hud.addChild(this.pulseButton);
    }

    private drawPulseButton(ready: number): void {
        const g = this.pulseButton.graphics;
        g.clear();
        g.drawCircle(60, 60, 59, ready >= 1 ? C.gold : "#45635a", C.gold, 2);
        g.drawCircle(60, 60, 50, ready >= 1 ? "#f7e7b3" : "#2b524d");
        if (ready < 1) g.drawPie(60, 60, 43, -90, -90 + ready * 360, "#819b72");
        g.drawCircle(60, 43, 13, ready >= 1 ? C.night : C.gold);
        g.drawCircle(66, 38, 13, ready >= 1 ? "#f7e7b3" : "#2b524d");
    }

    private buildOverlay(): void {
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
        this.overlayPanel.addChild(this.text(zhCN.englishTitle, 100, 524, 17, C.gold, true, 520, "center"));
        this.overlayPanel.addChild(this.text(zhCN.readyTip, 75, 666, 23, C.white, false, 570, "center"));
        this.overlayPanel.addChild(this.overlayScore);
        this.startButton.pos(118, 812);
        this.startButton.size(484, 88);
        this.startButton.graphics.drawRoundRect(0, 0, 484, 88, 30, 30, 30, 30, "#f1dfa8", "#fff6d8", 2);
        this.startButton.addChild(this.actionText);
        this.startButton.on(Laya.Event.CLICK, this, () => this.actions.start());
        this.overlayPanel.addChild(this.startButton);
        this.overlayPanel.addChild(this.text(zhCN.keyboardTip, 74, 946, 18, C.muted, false, 572, "center"));
        this.overlay.addChild(this.overlayPanel);
        this.overlay.addChild(this.text(zhCN.brand, 100, 1186, 16, C.muted, true, 520, "center"));
    }

    private drawOverlay(state: GameUIModel): void {
        if (state.phase === "ready") {
            this.overlayTitle.text = zhCN.title;
            this.overlaySubtitle.text = zhCN.subtitle;
            this.overlayScore.text = zhCN.goal;
            this.actionText.text = zhCN.start;
        } else if (state.phase === "paused") {
            this.overlayTitle.text = zhCN.pauseTitle;
            this.overlaySubtitle.text = zhCN.subtitle;
            this.overlayScore.text = `${zhCN.score} ${state.score}${zhCN.scoreUnit}`;
            this.actionText.text = zhCN.resume;
        } else {
            this.overlayTitle.text = state.phase === "won" ? zhCN.won : zhCN.lost;
            this.overlaySubtitle.text = state.phase === "won" ? zhCN.wonTip : zhCN.lostTip;
            this.actionText.text = zhCN.again;
        }
    }

    private drawWorld(state: GameUIModel): void {
        const g = this.world.graphics;
        g.clear();
        for (const entity of state.entities) this.drawEntity(entity, state.elapsed);
        for (const particle of state.particles) {
            g.drawCircle(particle.x, particle.y, Math.max(1, particle.radius * particle.life / particle.maxLife), particle.color);
        }
        if (state.pulseWave > 0) {
            const progress = 1 - state.pulseWave / 0.65;
            g.drawCircle(state.playerX, state.playerY, 50 + progress * 205, null, C.gold, 6 * (1 - progress) + 1);
            g.drawCircle(state.playerX, state.playerY, 38 + progress * 185, null, C.white, 2);
        }
        if (state.phase !== "ready") this.drawPlayer(state.playerX, state.playerY, state.elapsed, state.invulnerable);
    }

    private drawEntity(entity: FallingEntity, elapsed: number): void {
        const g = this.world.graphics;
        if (entity.kind === "firefly") {
            const flicker = Math.sin(elapsed * 9 + entity.id) * 3;
            g.drawCircle(entity.x, entity.y, 34 + flicker, "#315c54");
            g.drawCircle(entity.x, entity.y, 23 + flicker, "#9baf7c");
            g.drawPoly(entity.x, entity.y, [-7, 0, -22, -10, -17, 7, -6, 8], "#d2d59a");
            g.drawPoly(entity.x, entity.y, [7, 0, 22, -10, 17, 7, 6, 8], "#d2d59a");
            g.drawCircle(entity.x, entity.y, 11, C.gold);
            g.drawCircle(entity.x - 3, entity.y - 4, 4, C.white);
        } else if (entity.kind === "blossom") {
            g.drawCircle(entity.x, entity.y, 30, "#385b59");
            for (let i = 0; i < 5; i++) {
                const a = entity.rotation + i * Math.PI * 2 / 5;
                const px = entity.x + Math.cos(a) * 13;
                const py = entity.y + Math.sin(a) * 13;
                g.drawCircle(px, py, 11, i % 2 ? "#d99aac" : "#f1b9bb");
            }
            g.drawCircle(entity.x, entity.y, 10, C.gold);
            g.drawCircle(entity.x - 3, entity.y - 3, 3, C.white);
        } else {
            g.drawCircle(entity.x, entity.y, entity.radius + 8, "#34434b");
            g.drawPoly(entity.x, entity.y, this.thornPoints(entity.radius, entity.rotation), "#604a66", C.thorn, 2);
            g.drawCircle(entity.x - 5, entity.y - 4, 7, "#9b7593");
            g.drawCircle(entity.x + 9, entity.y + 7, 4, "#302f49");
        }
    }

    private drawPlayer(x: number, y: number, time: number, invulnerable: number): void {
        const g = this.world.graphics;
        const bob = Math.sin(time * 6) * 4;
        g.drawCircle(x, y, 57, "#23504e");
        g.drawCircle(x, y, 43, "#5a7e68");
        if (invulnerable > 0) g.drawCircle(x, y, 56, null, C.gold, 3);
        g.drawPoly(x, y + bob, [-7, 0, -35, -19, -36, 11, -13, 17], "#9fbd91", "#d8dda6", 2);
        g.drawPoly(x, y + bob, [7, 0, 35, -19, 36, 11, 13, 17], "#9fbd91", "#d8dda6", 2);
        g.drawCircle(x, y + bob, 22, "#e9da9b", C.white, 2);
        g.drawCircle(x - 7, y + bob - 3, 2, C.night);
        g.drawCircle(x + 7, y + bob - 3, 2, C.night);
        g.drawCircle(x - 14, y + bob + 6, 3, C.rose);
        g.drawCircle(x + 14, y + bob + 6, 3, C.rose);
        g.drawPoly(x, y + bob - 18, [0, 0, -9, -18, 1, -10, 11, -18], C.leafLight);
    }

    private thornPoints(radius: number, rotation: number): number[] {
        const points: number[] = [];
        for (let i = 0; i < 16; i++) {
            const angle = rotation + i * Math.PI / 8;
            const r = i % 2 === 0 ? radius : radius * 0.72;
            points.push(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        return points;
    }

    private text(value: string, x: number, y: number, size: number, color: string,
        bold = false, width = 180, align: "left" | "center" = "left"): Laya.Text {
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
