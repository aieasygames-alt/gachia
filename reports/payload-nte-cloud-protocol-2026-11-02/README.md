# Payload R15：NTE 发布协议、旧资源与兼容恢复

日期：2026-11-02。沿用本机 Payload/PostgreSQL、公众站点 Cloudflare 多 Worker 路线。内容准确度不是首发门槛；用户已给予后续所需操作默认授权。本轮没有修改内容、上传云版本或切换公网流量。

## 结论

**NTE 的协议接入、当前版本旧资源绑定、双目标前向保留、旧 runtime 兼容恢复本地实测与持久安装已完成。真实编辑候选的云预览、推广、恢复及 partial failure 仍未验收，L05 不能整体关闭。**

不再把 NTE 的协议参数化、旧资源来源或本地兼容恢复列为完全空缺；也不把本轮无变化诊断制品当作可发布候选。

## 协议修复

- 新增 `desktop-release-scope.mjs`，只允许 `genshin → main` 或 `nte → main`，严格绑定对应两个 service；拒绝跨游戏、缺失/额外 owner、顺序颠倒和服务错配。
- 候选封存/上传、兼容恢复封存/上传/回执、推广续接、同 UUID 续验和人工恢复共用游戏边界。推广请求层要求显式 game，只能向两个固定 service 写入精确 UUID 的 100% 部署请求。
- NTE 必须为 `NTE_DEPLOYMENT_MODE=live`。修复 Main 公网验收遗漏 game、可能默认校验 Genshin JSON 的问题。
- 恢复上传在第一次网络操作及创建 journal 前，预检所有 owner/service/sourceVersion，避免先上传 NTE 才发现 Main 基线错配。失败后仍只读对账、不自动重试、不直接回旧 UUID。
- 两游戏各有 25 项组合续验/恢复测试；NTE 组合 fixture 使用真实合同形状的 live binding。另有 NTE 恢复上传、第二目标失败、错游戏预览、拓扑漂移及双游戏全目标预检测试。云 API/精确预览在这些测试中为 mock，不是真实云 E2E。

## 旧资源与真实 HTTP

| 检查 | 结果 |
| --- | --- |
| NTE 当前版本 | `cb854ebe-544d-40b6-9217-5df329a8a1cb` |
| NTE 历史静态资源 | 116 文件，1,611,112 bytes |
| NTE 公网 Router 静态字节 | 116/116，与历史 pin/本地字节一致 |
| Main 可信旧资源 | 441 文件，11,240,745 bytes；当前 UUID 与历史制品来源一致 |
| 前向保留制品 loopback | NTE 295 + Main 516 = **811/811** |
| 兼容恢复制品 loopback | NTE 295 + Main 516 = **811/811** |
| 旧 runtime 与当前公网对照 | NTE 4 + Main 4 = **8/8** |
| 七服务部署与受保护拓扑 | 初始、资源采集后、最终快照一致 |

NTE 历史制品完整 manifest/tree 重新验 pin；当前 Worker multipart 的模块摘要与历史推广记录一致。资源采集前后保存部署 ID、版本和 script etag。静态字节读取明确标记为历史本地制品来源，再独立逐项进行新鲜公网 Router 字节探测；不冒充新鲜 direct-origin 采集，也不声称云端完整 asset manifest 已枚举。

Main 复用已验证的 GitHub 原制品与恢复来源，重新核对静态清单、当前 UUID 并保存当前 Worker multipart；本轮没有重新下载 GitHub 制品。

前向制品复用已完成的 NTE/Main 原文诊断构建，仅复制到新目录增加旧资源，没有重建、不生成 release plan/releaseKey。NTE 同时保留原始及 Router 命名空间，新增 202 条路径；Main 新增 374 条路径。

恢复制品来自已 pin 的旧 NTE runtime 和双摘要校验恢复的 Main archive，再加入诊断构建静态资源并集。旧 runtime 文件摘要保持不变，NTE/Main 分别增加 **58/71** 条路径。这些路径在原始旧产物缺失，不能用直接旧 UUID 回退代替兼容恢复。

实际 HTTP 保存状态、headers、MIME、cache、正文和 SHA；抽样三语言指南正文/metadata/JSON-LD/图片引用指纹、sitemap/robots、Main NTE JSON、账号关闭/no-store 及两个制品全部选定静态路径。恢复路由另与当前公网指纹/字节对照。不覆盖浏览器跳转/Flight、全部页面或外部媒体字节，也不构成未来候选的云验收。

## 测试与安装

- `pnpm test:release`：桌面发布 **310/310**，既有 Node **304/304**，Python **31/31**。
- 安装器依赖闭包测试和实际 staged/installed import 通过。维护锁下备份后安装 **18 个 publisher 模块 + manager**，逐文件校验 SHA；安装版 NTE scope、演练拒绝和跨游戏拒绝 smoke 通过，网络调用 0。
- 备份：`/Users/robert/Library/Application Support/GachiaCMS/publisher-upgrades/nte-20261102T035136Z-b8f3b4`。无 CMS 重建/重启。
- CMS **161/161**、typecheck 是 R14 最近基线，本轮未重跑，不写成本轮新结果。
- 初次只读云请求 401 后，以已有 Wrangler 登录刷新成功，未申请新权限。初次诊断误用了云 preview 专属 noindex 校验，第二次静态 MIME 检查遗漏 Main PNG，均在报告执行脚本修正后重跑通过；生产预览 noindex 门禁没有放宽。失败日志、响应及私有诊断目录保留。

## 证据位置

- 资源 pin/版本绑定：`assets.json`；完整私有证据 `/Users/robert/.gachia-cms-audits/nte-retention-44q23z`。
- 最终前向/恢复结果：`retention-recovery-passed.json`；实际正文和构建物在其 `work` 目录 `diagnostic-HdRGwA`。
- `capture-assets.mjs`、`retain-and-recover.mjs`、`install-tested.py` 是本轮可检查的执行脚本，不是新的通用发布入口。
- `installation.json`、`release-tests.log`、`cloud-final-check.json`、`local-before.json`、`local-final.json` 和 `evidence-index.json` 为安装、回归及最终状态入口。
- 当前资源证据只绑定所记录版本；任一相关 owner 版本变化后，正式候选必须重新取证并验基线，不能跳过新鲜度门禁复用。

## 剩余任务与下一步

1. **L06 最小操作交付**：形成编辑→发布意图→导出→预览→推广→故障处置手册，收口低危依赖结论及无秘密工程交付；不默认执行 Git push 或重新开启云自动部署。
2. **L04/L05 真实云验收**：当前仍没有真实编辑候选，84 条均 draft/hold，在线 DB 逻辑摘要不变。出现真实编辑后，用其执行双候选/双恢复版本预览、精确 UUID 推广、公网验收；真实云 partial failure/恢复未完成。不会为了测试伪造编辑或批量清 hold。
3. **L03 灾备**：沿用 R11 本地加密恢复证据；异地副本、独立密钥托管、跨机重建仍未完成，旧归档不含本轮新增代码。

L01/L02 保持本地演练/安装完成、真实云未验；L05 从“协议/资源/恢复待实现”推进为“本地实现与实测安装完成，真实云未验”。P0–P7/T01–T12 总体不据此整体关闭，全类型迁移、通用运营与完整权威移交仍属后续范围。
