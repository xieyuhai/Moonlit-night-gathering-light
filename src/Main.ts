import { GameViewModel } from "./viewmodel/GameViewModel";
import { ScoreRepository } from "./repository/ScoreRepository";
import { GamePage } from "./page/GamePage";

const { regClass } = Laya;

interface WechatLifecycle {
    onHide(callback: () => void): void;
    offHide?(callback: () => void): void;
}

@regClass()
export class Main extends Laya.Script {
    private viewModel: GameViewModel;
    private page: GamePage;
    private readonly keys = new Set<string>();

    onStart(): void {
        Laya.stage.designWidth = 720;
        Laya.stage.designHeight = 1280;
        Laya.stage.scaleMode = Laya.Stage.SCALE_SHOWALL;
        Laya.stage.alignH = Laya.Stage.ALIGN_CENTER;
        Laya.stage.alignV = Laya.Stage.ALIGN_MIDDLE;
        Laya.stage.bgColor = "#071c28";
        Laya.stage.updateCanvasSize();
        this.viewModel = new GameViewModel(new ScoreRepository());
        this.page = new GamePage(this.owner as Laya.Scene, {
            start: () => this.viewModel.start(),
            pause: () => this.viewModel.togglePause(),
            pulse: () => this.viewModel.pulse(),
            move: (x, y) => this.viewModel.setTarget(x, y)
        });
        this.viewModel.subscribe(state => this.page.render(state));
        Laya.stage.on(Laya.Event.KEY_DOWN, this, this.handleKeyDown);
        Laya.stage.on(Laya.Event.KEY_UP, this, this.handleKeyUp);
        if (typeof document !== "undefined") document.addEventListener("visibilitychange", this.handleVisibilityChange);
        this.wechatLifecycle()?.onHide(this.handleWechatHide);
        Laya.timer.frameLoop(1, this, this.tick);
    }

    private handleKeyDown(event: Laya.Event): void {
        const key = String((event as any).key || "").toLowerCase();
        if (key === " " || key === "space") this.viewModel.pulse();
        else if (key === "escape" || key === "p") this.viewModel.togglePause();
        else if (key === "enter") this.viewModel.start();
        this.keys.add(key);
    }

    private handleKeyUp(event: Laya.Event): void {
        this.keys.delete(String((event as any).key || "").toLowerCase());
    }

    private handleVisibilityChange = (): void => {
        if (document.hidden) this.viewModel.pause();
    };

    private handleWechatHide = (): void => this.viewModel.pause();

    private wechatLifecycle(): WechatLifecycle | undefined {
        return (globalThis as typeof globalThis & { wx?: WechatLifecycle }).wx;
    }

    private tick(): void {
        const horizontal = Number(this.keys.has("d") || this.keys.has("arrowright")) - Number(this.keys.has("a") || this.keys.has("arrowleft"));
        const vertical = Number(this.keys.has("s") || this.keys.has("arrowdown")) - Number(this.keys.has("w") || this.keys.has("arrowup"));
        this.viewModel.update(Math.min(Laya.timer.delta / 1000, 0.05), horizontal, vertical);
    }

    onDestroy(): void {
        Laya.timer.clear(this, this.tick);
        Laya.stage.off(Laya.Event.KEY_DOWN, this, this.handleKeyDown);
        Laya.stage.off(Laya.Event.KEY_UP, this, this.handleKeyUp);
        if (typeof document !== "undefined") document.removeEventListener("visibilitychange", this.handleVisibilityChange);
        this.wechatLifecycle()?.offHide?.(this.handleWechatHide);
        this.page?.dispose();
    }
}
