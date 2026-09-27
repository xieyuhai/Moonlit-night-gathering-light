interface WechatStorage {
    getStorageSync(key: string): unknown;
    setStorageSync(key: string, value: number): void;
}

export class ScoreRepository {
    private readonly key = "moonlit-garden.best.v1";
    readBest(): number {
        try {
            const wxStorage = this.wechatStorage();
            const value = Number(wxStorage ? wxStorage.getStorageSync(this.key) : localStorage.getItem(this.key));
            return Number.isFinite(value) && value > 0 ? value : 0;
        } catch { return 0; }
    }
    saveBest(score: number): void {
        try {
            const wxStorage = this.wechatStorage();
            if (wxStorage) wxStorage.setStorageSync(this.key, score);
            else localStorage.setItem(this.key, String(score));
        } catch { /* Storage is optional. */ }
    }

    private wechatStorage(): WechatStorage | undefined {
        return (globalThis as typeof globalThis & { wx?: WechatStorage }).wx;
    }
}
