# 内容批次 Worker 本地验收

日期：2026-10-15。承接 content-launch-build-acceptance-2026-10-15.md。

## 本轮变更

- 绿梦 next.config.ts 显式设置 outputFileTracingRoot 为仓库根目录，不删除用户家目录的锁文件；重建不再出现 workspace root 推断警告。
- 源码清单 reports/content-launch/source-freeze-worker-2026-10-15.json 固定 2152 个输入。包含已有工作台实验，不代表这些文件已审阅、获准上线或属于本内容批次；未暂存、提交、推送。
- 构建后再次核对源码清单通过。产物普通文件 SHA256 与链接可移植性结果保存于 worker-artifacts-2026-10-15.json；不是不可变发布归档。

## 构建与打包

五个应用严格 Next 补丁检查、OpenNext 构建、自包含文件系统检查、Wrangler deploy --dry-run 均通过。
Next/OpenNext 使用 Node20；Wrangler 使用本机 Node25.9.0。未安装依赖或更新 Wrangler。

| 应用 | 最终构建模式 | dry-run 原始 KiB | gzip KiB |
| --- | --- | ---: | ---: |
| 绿梦 | production | 4976.79 | 984.03 |
| 原神 | production | 8576.02 | 1299.84 |
| 异环 | live | 6711.05 | 1300.64 |
| 蓝色星原 | 默认生产 | 5152.97 | 1024.01 |
| 主站 | 默认生产 | 13646.27 | 2755.06 |

原神/异环首次通用构建未显式传生产索引模式，已用 production/live 重建；最终核对与打包针对重建后的产物。不可使用首次 preview 产物上线。
每个产物均有 19 个内部相对链接；可移植性检查不证明所有外部模块、账户限额或云端运行正确。
主站仍有既有 auth-dialog effect cleanup lint 警告，未改无关认证代码。
构建及打包日志保存在 reports/content-launch/worker-logs/。

## 真实本地 Router 联调

- 直接访问绿梦 Worker：HTML、canonical、正文、robots、sitemap 正常，但带 /_games/lvmeng/ 前缀的资源 404，页面验收失败。失败证据保留在 lvmeng-worker-local-2026-10-15.json，不将未加载 JS 时的勾选结果算作水合通过。
- 仓库 Router 已实现资源前缀到 /_next/ 的重写，因此启动真实本地 Router，通过本地 service binding 连接绿梦 Worker；没有修改生产路由或掩盖资源失败。
- 经 Router 验收：首页、下载、何雨莲详情、开服核验台，1440/390 两种宽度共 8 项通过；HTTP200、正文、canonical、无横向溢出、无 pageerror、无资源失败，核验台勾选刷新保留。
- 公开路径 /sitemaps/lvmeng/index.xml 通过，含何雨莲；共 9 项通过。证据 lvmeng-router-worker-local-2026-10-15.json。
- Router 回归 3 文件/31 测试通过；绿梦 robots 策略 2 测试通过。
- 本轮两个本地 Worker 服务均已停止。

## 发布边界与下一步

本轮没有真实 deploy/upload、云端设置修改、数据库业务写入、Git 提交/推送或 Actions 调度。
其他四个应用只有构建/打包与先前 Next 页面验收，没有本轮完整 Worker 浏览器验收。
主站真实登录、统计/广告、云端缓存与生产 Router 切流仍未验收；不能宣布生产发布完成。

下一步先精确分离本内容批次与后台/HI3 混合工作区，审阅提交清单并准备基线 Worker 版本和回滚步骤。
需要云端预发布或生产部署时，须明确授权目标环境与范围；普通“继续”不等于生产写入授权。
