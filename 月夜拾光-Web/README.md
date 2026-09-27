# 小游戏工程

3D 新作《云端拾星》位于 [云端拾星/](云端拾星/README.md)，包含 LayaAir 3.4 工程、Web 预览包及画面截图。

《棱镜回路》位于 [棱镜回路/](棱镜回路/README.md)，独立于下方的《月夜拾光》工程。

# 月夜拾光

基于 LayaAir 3.4 的竖屏休闲小游戏。玩家操控光灵，在月夜花园里收集萤火、躲开暗荆，坚持 60 秒并刷新最高分。画面全部由引擎绘制，无外部素材、账号或网络请求。

## 玩法

- 手指按住并拖动光灵；电脑可用 WASD 或方向键。
- 收集萤火获得 10 分起步的连拾奖励；3 秒内连续收集，最高 8 倍。
- 碰到暗荆损失一片花瓣；收集粉色花朵可恢复花瓣。花瓣用尽则本局结束。
- 点击右下角月光波或按空格，可清除附近暗荆并吸收萤火；冷却 7 秒。
- 坚持到 60 秒结算。页面切入后台时自动暂停，本机保存最高分。

## 运行与构建

工程入口为 [`月夜拾光.laya`](月夜拾光.laya)，可用 LayaAir IDE 3.4 打开。官方 CLI 构建 Web 版：

```bash
./scripts/build.sh
./scripts/preview.sh
```

浏览器打开 `http://127.0.0.1:8765/`；端口被占用时可执行 `PORT=8766 ./scripts/preview.sh`。`build.sh` 优先使用 `~/.layaair/layaair`，也可通过 `LAYAAIR_CLI` 指定。若未安装 CLI，但 `release/web/libs` 已有引擎运行库，脚本会用 `tsc` 更新预览包；可通过 `TSC_BIN` 指定 TypeScript 编译器。正式发布建议使用官方 IDE/CLI 重新构建。

环境：Node.js、TypeScript 编译器或 LayaAir CLI 3.4；本地预览脚本需 Python 3。`release/web/` 是构建输出，已忽略版本控制。如果本机 TypeScript 未加入 PATH，可设置 `TSC_BIN=/path/to/typescript/bin/tsc`。

规则检查：`node scripts/check-rules.cjs`；若 `tsc` 不在 PATH 中，可设置 `TSC_BIN`。

## Cloudflare Pages 自动发布

本工程可用 Cloudflare Pages 的 Git 集成持续发布 Web 版。每次向连接的 GitHub/GitLab 仓库推送代码，Pages 会自动执行构建并更新站点。当前工程尚未配置 Git 远端，需先把工程推送到自己的仓库；务必将 `月夜拾光-Web/libs/` 一并纳入版本控制，它是无 LayaAir IDE 的云端构建环境所需的引擎运行库。`release/` 和 `node_modules/` 不需要提交。

在 Cloudflare 控制台进入 **Workers & Pages → Create → Pages → Connect to Git**，选中仓库后填写：

| 配置项 | 值 |
| --- | --- |
| Framework preset | None |
| Root directory | 仓库根目录 |
| Build command | `npm ci && npm run build:pages` |
| Build output directory | `release/web` |
| Production branch | 仓库主分支（例如 `main`） |

首次部署完成后会得到 `*.pages.dev` 地址。后续修改 `src/` 并推送即可触发构建；其他分支可生成预览部署。构建脚本先复制已纳入版本控制的 LayaAir Web 运行库，再用锁定版本的 TypeScript 编译最新源码，并执行玩法规则检查。Cloudflare Pages 仅托管 Web 版；微信小游戏仍需由 LayaAir IDE 单独导出。

## 商业化预留

60 秒局长、明确的结算页和最高分重玩循环适合广告或付费版本。建议将激励视频仅用于结算后可选复活或奖励皮肤，将去广告与外观包作为付费内容；避免在操作中途插屏。当前版本未接入广告、支付 SDK，也不会展示虚假的广告入口。接入任一平台前，需要完成 SDK 技术评审、隐私说明及真机验证。微信小游戏需在 LayaAir IDE 的构建发布面板选择“微信小游戏”，再用微信开发者工具导入生成的 `release/wxgame` 目录并真机测试；Web 预览包不能直接作为微信小游戏上传。

## 架构与 API

- `src/Main.ts`：LayaAir 生命周期、键盘和页面可见性事件。
- `src/page/GamePage.ts`：绘图与输入事件；不处理得分、碰撞或存档规则。
- `src/viewmodel/GameViewModel.ts`：游戏单一状态源、碰撞、生成、计分、连拾和结算。
- `src/model/GameModels.ts`：游戏实体和 UI 状态模型。
- `src/repository/ScoreRepository.ts`：本机最高分读写网关。
- `src/config/zh_CN.ts`：全部中文可见文案。

无远程 REST API。页面向 ViewModel 发送 `start`、`pause`、`pulse`、`move` 事件；ViewModel 通过 `subscribe(GameUIModel)` 单向更新 UI。无 DTO 或网络层。

## 数据字典

| 字段 | 含义 |
| --- | --- |
| `phase` | `ready`、`playing`、`paused`、`won`、`lost` |
| `score` / `best` | 本局微光分数 / 本机最高分 |
| `hearts` | 花瓣数，范围 0–3 |
| `combo` | 连拾倍数，范围 0–8；3 秒内续接 |
| `secondsLeft` | 本局剩余秒数 |
| `pulseReady` | 月光波充能进度，范围 0–1 |
| `entities.kind` | `firefly` 萤火、`thorn` 暗荆、`blossom` 花朵 |

本机仅存储 `moonlit-garden.best.v1` 最高分；Web 使用 `localStorage`，微信小游戏使用 `wx.getStorageSync` / `wx.setStorageSync`。不存储身份信息、位置或设备权限状态。

## 发布说明

- 版本：1.1.1，2026-09-26。包含完整可玩的 Web 竖屏版本及微信小游戏本地存储、后台暂停适配。
- 构建脚本：`scripts/build.sh`；预览脚本：`scripts/preview.sh`。
- 配置：`settings/PlayerSettings.json`、`settings/BuildSettings.json`；720 × 1280 设计分辨率。
- 签名：Web 版无需应用签名；平台小游戏或 Native 包需在对应平台配置签名与商店资料。
- 第三方 SDK：仅 LayaAir 3.4 引擎；[MIT License](https://github.com/layabox/LayaAir/blob/LayaAir_3.4/LICENSE)，授权说明见 [`LICENSE.md`](LICENSE.md)。TypeScript 仅用于构建。
- 发布前应在目标设备复测触控、性能、横竖屏、刘海屏和目标平台适配；当前验证范围为 Web 浏览器。
