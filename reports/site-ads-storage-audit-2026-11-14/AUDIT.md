# AdSense 与项目空间检查（2026-11-14）

> 后续已完成：用户授权后，广告已正式恢复并在五站观察到实际填充；23 个旧缓存目录全部清理，真实释放 3.172 GiB。完整上线、浏览器、来源与空间回执见 [R121 EXECUTION.md](../adsense-restoration-2026-11-14-r121/EXECUTION.md)。以下保留初检时的事实与估算。

本轮为只读检查；仅新增本报告，没有删除文件、修改代码或部署。

## AdSense

结论：当前站点没有启用 AdSense，不能判定为广告展示正常。Chrome 实测主站、异环娜娜莉、原神胡桃三个线上页面，AdSense 脚本、手动广告位和广告 iframe 均为 0。普通空 iframe 不计为广告。

- https://gachia.com/en
- https://gachia.com/en/nte/characters/nanally
- https://gachia.com/en/genshin/characters/hu-tao

https://gachia.com/ads.txt 返回 HTTP 200，授权发布商为 `pub-8569630257520732`；这只证明 ads.txt 配置存在，不能使广告自动展示。

主站隐私偏好可见原文：

> You can enable Google Analytics. Rejecting does not affect reading or local tools. Ads and Clarity session replay remain disabled. Changes reload the page; data already sent cannot be recalled.

Git 提交 `a1b75085b5c03423a4be9980b65b8acebd7a76f9`（2026-10-17）移除了 `google-adsense` 脚本；当前 `apps/web/components/production-integrations.tsx` 只按用户选择加载 Google Analytics。`apps/web/__tests__/production-integrations.test.ts` 还明确防止引入广告脚本。独立游戏布局没有接入该广告脚本。

恢复展示需要在 Main 和游戏应用接回广告加载，协调隐私选择与说明、更新现有测试，并核对 AdSense 后台站点批准/投放设置。仅恢复 ads.txt 或点击“允许访问分析”不会恢复广告。本轮未改动这些设置，也没有点击广告。未登录 AdSense 后台，因此不对账户审批、政策限制、自动广告开关和收益作判断。

## 磁盘

检查时可用 **14.57 GiB**。14 GiB 标准完整构建预算目前仅有 **0.57 GiB** 余量，不宜在连续构建前耗尽。

初始 `du` 盘点（GiB，目录占用估算）：

| 路径 | GiB | 说明 |
|---|---:|---|
| `/Users/robert/Documents/gachia` | 1.73 | 原始 checkout，14 个 tracked 文件有用户修改 |
| `/Users/robert/.codex/worktrees/payload-unified-maintenance/gachia` | 38.07 | 当前维护来源；reports 约 34.58 GiB |
| `/Users/robert/.codex/worktrees/account-deletion-release/gachia` | 4.82 | 历史工作目录；tracked 状态干净 |
| `/Users/robert/.codex/worktrees/multi-game-s1-release-safety/gachia` | 6.89 | 历史工作目录；tracked 状态干净 |
| `/Users/robert/.codex/worktrees/third-party-reviewed-candidate/gachia` | 0.08 | 很小，不值得优先处理 |

### 第一批可清理清单

下列为可重新安装的依赖或重新构建的输出，不含源码、正式发布记录和恢复来源。每组都有 pnpm-lock.yaml，清单路径下 Git tracked 文件数均为 0。清理前需确认没有其他会话正在使用这些本地构建；此次进程检查中唯一 Next 服务来自项目外的正式桌面 CMS 安装目录。

#### `/Users/robert/.codex/worktrees/multi-game-s1-release-safety/gachia` — 3.340 GiB

| 相对路径 | GiB | 恢复方式 |
|---|---:|---|
| `node_modules` | 1.975 | 依原目录锁文件重新安装 |
| `apps/game-genshin/.next` | 0.370 | 重新构建 |
| `apps/game-nte/.next` | 0.202 | 重新构建 |
| `apps/game-azur-promilia/.next` | 0.173 | 重新构建 |
| `apps/game-lvmeng/.next` | 0.172 | 重新构建 |
| `apps/game-genshin/.open-next` | 0.133 | 重新构建 |
| `apps/web/.open-next` | 0.115 | 重新构建 |
| `apps/web/.next` | 0.097 | 重新构建 |
| `apps/game-nte/.open-next` | 0.038 | 重新构建 |
| `apps/game-lvmeng/.open-next` | 0.033 | 重新构建 |
| `apps/game-azur-promilia/.open-next` | 0.032 | 重新构建 |

#### `/Users/robert/.codex/worktrees/account-deletion-release/gachia` — 2.865 GiB

| 相对路径 | GiB | 恢复方式 |
|---|---:|---|
| `node_modules` | 1.444 | 依原目录锁文件重新安装 |
| `apps/game-genshin/.next` | 0.380 | 重新构建 |
| `apps/game-nte/.next` | 0.215 | 重新构建 |
| `apps/game-azur-promilia/.next` | 0.192 | 重新构建 |
| `apps/game-lvmeng/.next` | 0.182 | 重新构建 |
| `apps/game-genshin/.open-next` | 0.134 | 重新构建 |
| `apps/web/.open-next` | 0.116 | 重新构建 |
| `apps/web/.next` | 0.097 | 重新构建 |
| `apps/game-nte/.open-next` | 0.038 | 重新构建 |
| `apps/game-azur-promilia/.open-next` | 0.034 | 重新构建 |
| `apps/game-lvmeng/.open-next` | 0.034 | 重新构建 |

#### `/Users/robert/Documents/gachia` — 1.111 GiB

| 相对路径 | GiB | 恢复方式 |
|---|---:|---|
| `node_modules` | 1.111 | 依原目录锁文件重新安装 |

第一批合计 **7.32 GiB**，理论上可将余量提高到约 **21.88 GiB**。这是 `du` 估算，硬链接与 APFS 克隆/快照可能使真实释放量较低，应以清理后的 `df` 为准。依赖删除后，这三个旧 checkout 需要重新安装依赖才能执行本地命令；不影响已经部署的 Workers。当前维护 worktree 的两份常用依赖不在第一批清单内。

### 进一步评估后才处理

- reports 内有 8 份冻结构建 `source/node_modules`，占用估算合计约 7.55 GiB。它们技术上可按锁文件安装，但涉及 R79/R118/R119/R120 构建证据，必须先核对封装清单与哈希规则，不能算入本次可直接清理额度。
- `services/content-cms/.local` 约 0.97 GiB，包含历史测试/迁移数据库。当前运行的 CMS 在 `/Users/robert/Library/Application Support/GachiaCMS/releases/20261107T113338Z-unified-cedcaf8f/services/content-cms`。本地 .local 不等于无价值缓存；逐份核实与备份后再决定。
- 历史 worktree 中 `.release-records` 合计约 5.31 GiB；先外部归档和校验，不能整目录删除 worktree 来回收。

### 必须保留

- 当前维护源码、原始 checkout 中的用户修改、`.git`、锁文件和 patches。
- R120 `independent-sources-01/source-index.json` 及 115 个来源、R119 父来源、封装候选/恢复包、delivery/journal/备份与实际验收证据。
- 已上线胡桃修改、娜娜莉修改与攻略增量的来源接续。
- 发布 artifact 中 `server-functions/.../node_modules` 和 `.next`：这些是 Worker 运行包的一部分，不能套用依赖/缓存清理规则。
- 正在运行的桌面 CMS 安装、生产数据库、备份和媒体。

完整精确清单见 `storage-inventory.json`，线上广告观察见 `ads-observations.json`。本轮没有创建新的 worktree。
