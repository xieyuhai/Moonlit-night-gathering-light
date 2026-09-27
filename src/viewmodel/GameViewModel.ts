import { FallingEntity, GameUIModel, Particle, Phase } from "../model/GameModels";
import { ScoreRepository } from "../repository/ScoreRepository";

const DURATION = 60;

export class GameViewModel {
    private phase: Phase = "ready";
    private score = 0;
    private best: number;
    private hearts = 3;
    private combo = 0;
    private comboTimer = 0;
    private elapsed = 0;
    private spawnTimer = 0;
    private pulseCooldown = 0;
    private pulseWave = 0;
    private invulnerable = 0;
    private playerX = 360;
    private playerY = 980;
    private targetX = 360;
    private targetY = 980;
    private entities: FallingEntity[] = [];
    private particles: Particle[] = [];
    private nextId = 0;
    private listener: (state: GameUIModel) => void = () => {};

    constructor(private readonly scores: ScoreRepository) { this.best = scores.readBest(); }

    subscribe(listener: (state: GameUIModel) => void): void {
        this.listener = listener;
        this.emit();
    }

    start(): void {
        if (this.phase === "playing") return;
        if (this.phase === "paused") { this.phase = "playing"; this.emit(); return; }
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

    togglePause(): void {
        if (this.phase === "playing") this.phase = "paused";
        else if (this.phase === "paused") this.phase = "playing";
        else return;
        this.emit();
    }

    pause(): void {
        if (this.phase === "playing") {
            this.phase = "paused";
            this.emit();
        }
    }

    setTarget(x: number, y: number): void {
        if (this.phase !== "playing") return;
        this.targetX = Math.max(58, Math.min(662, x));
        this.targetY = Math.max(250, Math.min(1045, y));
    }

    pulse(): void {
        if (this.phase !== "playing" || this.pulseCooldown > 0) return;
        this.pulseCooldown = 7;
        this.pulseWave = 0.65;
        let cleared = 0;
        this.entities = this.entities.filter(entity => {
            if (Math.hypot(entity.x - this.playerX, entity.y - this.playerY) >= 245) return true;
            if (entity.kind === "thorn") { cleared++; this.burst(entity.x, entity.y, "#bf7ca7", 10); }
            else if (entity.kind === "firefly") this.collectFirefly(entity.x, entity.y);
            else { this.hearts = Math.min(3, this.hearts + 1); this.burst(entity.x, entity.y, "#f2a8b7", 10); }
            return false;
        });
        this.score += cleared * 5;
        this.burst(this.playerX, this.playerY, "#ecdea4", 20);
        this.emit();
    }

    update(dt: number, horizontal: number, vertical: number): void {
        if (this.phase !== "playing") return;
        this.elapsed += dt;
        if (this.elapsed >= DURATION) { this.elapsed = DURATION; this.finish("won"); return; }
        this.comboTimer = Math.max(0, this.comboTimer - dt);
        if (this.comboTimer === 0) this.combo = 0;
        this.pulseCooldown = Math.max(0, this.pulseCooldown - dt);
        this.pulseWave = Math.max(0, this.pulseWave - dt);
        this.invulnerable = Math.max(0, this.invulnerable - dt);

        if (horizontal || vertical) {
            const length = Math.hypot(horizontal, vertical);
            this.playerX += horizontal / length * 440 * dt;
            this.playerY += vertical / length * 440 * dt;
            this.targetX = this.playerX;
            this.targetY = this.playerY;
        } else {
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
        const active: FallingEntity[] = [];
        for (const entity of this.entities) {
            entity.y += entity.speed * dt;
            entity.rotation += entity.spin * dt;
            if (entity.y > 1060) continue;
            const distance = Math.hypot(entity.x - this.playerX, entity.y - this.playerY);
            if (distance < entity.radius + 24) {
                if (entity.kind === "firefly") this.collectFirefly(entity.x, entity.y);
                else if (entity.kind === "blossom") {
                    this.hearts = Math.min(3, this.hearts + 1);
                    this.burst(entity.x, entity.y, "#f2a8b7", 12);
                } else if (this.invulnerable <= 0) {
                    this.hearts--;
                    this.combo = 0;
                    this.invulnerable = 1.5;
                    this.burst(entity.x, entity.y, "#c68baa", 18);
                    if (this.hearts <= 0) { this.finish("lost"); return; }
                } else active.push(entity);
            } else active.push(entity);
        }
        this.entities = active;
        this.particles = this.particles.filter(p => {
            p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
            return p.life > 0;
        });
        this.emit();
    }

    private spawn(): void {
        const roll = Math.random();
        const kind: FallingEntity["kind"] = roll < 0.64 ? "firefly" : roll < 0.965 ? "thorn" : "blossom";
        const radius = kind === "thorn" ? 24 + Math.random() * 12 : kind === "blossom" ? 20 : 20;
        this.entities.push({ id: ++this.nextId, kind, x: 55 + Math.random() * 610, y: 265,
            radius, speed: 180 + this.elapsed * 3.2 + Math.random() * 90,
            rotation: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 2.6 });
    }

    private collectFirefly(x: number, y: number): void {
        this.combo = this.comboTimer > 0 ? Math.min(8, this.combo + 1) : 1;
        this.comboTimer = 3;
        this.score += 10 * this.combo;
        this.burst(x, y, "#f8e6a1", 9);
    }

    private burst(x: number, y: number, color: string, count: number): void {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 60 + Math.random() * 170;
            const life = 0.3 + Math.random() * 0.35;
            this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                life, maxLife: life, color, radius: 2 + Math.random() * 4 });
        }
        if (this.particles.length > 150) this.particles.splice(0, this.particles.length - 150);
    }

    private finish(phase: "won" | "lost"): void {
        this.phase = phase;
        if (this.score > this.best) { this.best = this.score; this.scores.saveBest(this.best); }
        this.emit();
    }

    private emit(): void {
        this.listener({ phase: this.phase, score: this.score, best: this.best,
            hearts: this.hearts, combo: this.combo, secondsLeft: Math.ceil(DURATION - this.elapsed),
            pulseReady: 1 - this.pulseCooldown / 7, pulseWave: this.pulseWave,
            playerX: this.playerX, playerY: this.playerY, invulnerable: this.invulnerable,
            entities: this.entities, particles: this.particles, elapsed: this.elapsed });
    }
}
