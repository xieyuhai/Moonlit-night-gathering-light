export type Phase = "ready" | "playing" | "paused" | "won" | "lost";

export interface FallingEntity {
    id: number;
    kind: "firefly" | "thorn" | "blossom";
    x: number;
    y: number;
    radius: number;
    speed: number;
    rotation: number;
    spin: number;
}

export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    radius: number;
}

export interface GameUIModel {
    phase: Phase;
    score: number;
    best: number;
    hearts: number;
    combo: number;
    secondsLeft: number;
    pulseReady: number;
    pulseWave: number;
    playerX: number;
    playerY: number;
    invulnerable: number;
    entities: FallingEntity[];
    particles: Particle[];
    elapsed: number;
}
