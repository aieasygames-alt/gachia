# R32 Payload 首次真实发布与共享 Main 交接

日期：2026-11-04。范围：仅此 Mac 的 Payload/PostgreSQL 编辑端与 Genshin/NTE 既有指南文字发布；公众网站继续由 Cloudflare 多 Worker 服务，无 CMS Tunnel/Mac 公网回源。内容准确度、翻译及跨 Mac 运行不作为首发门槛。

## 1. 实际结果与完成边界

**首次真实 Genshin 公网发布已完成，恢复后来源接续再发已完成；稳定限定 V1 与原始全范围迁移尚未全部完成。** 不把 CMS published、非活动版本上传或本地测试当公网验收。

- 实际发布标题：**原神快速上手指南：基础操作、元素反应与资源规划**，路径 `/zh/genshin/guides/quick-start-guide`。独立公网 HTML 与 Main JSON 采样通过，NTE JSON 逐字节保持。
- 四版本精确云预览、新鲜续验、双 owner 正式推广、公网验收及 Genshin source-advance 均成功。原 R31 partial/显式兼容恢复/source-recover 来源被本次全新 run 使用，原失败/恢复 journal 不重放。
- C04 当前：真实 NTE 共享 Main 只读来源登记与独立重新选择均通过；零 NTE 上传/部署，不当作 NTE 正式发布或双向连续性全部通过。
- C01 保持关闭；C02 实际恢复后再发闭环关闭；C03 首发完成、下一条独立正常编辑发布待验；C05a 保留 R30 本机恢复关闭，C05b 独立 key 目的地未配置。
- DB 仍为 83 draft/hold + 1 published/eligible；本轮没有 DB、正文、身份、媒体或其他 83 记录写入。没有制造下一条编辑或批量解除 hold。

实际接受记录见 `attempt/first-publication.json`、`attempt/release-final-audit.json` 和独立复核 `attempt/release-delivery-final-audit.json`。C03/C04 剩余条件见[有限完成计划](../../plans/payload-v1-completion-2026-11-03.md)。

## 2. 发布身份与多 Worker 边界

| 项目 | 本轮实际值 |
| --- | --- |
| releaseKey | `61cf1ede43df373693eea8cb2b83641ef3791876953ab8024c0233873de0bef6` |
| 候选 JSON SHA256 | `9e49bee84613e11cc261204eb83454ee1848809af094474fd8eccedcc550518b` |
| 全新 run | `~/.gachia-cms-releases/61cf1ede43df3736-461bda287526` |
| 冻结应用源码 | `2b59ade7d2f029cedbaaf4df76d0ea82b0c10b69`，精确验证 CI `41743786074` 成功 |
| Genshin 正式版本 | `026b39f0-84a1-47ee-a50f-2ea0f42d5658`，100% |
| Main 正式版本 | `059971df-99d8-4eab-a143-b0236f098a1b`，100% |
| NTE 未变版本 | `cb854ebe-544d-40b6-9217-5df329a8a1cb`，100% |
| 兼容恢复预览版本 | Genshin `dd27c3cf-64d6-48d8-903a-06a114bf7f90`；Main `52973390-1952-45a9-a134-b43690f35de3`，本轮未部署 |
| 推广 journal SHA256 | `4947029904373babfece39f7c26edbda3a1790bbcf1b7f33411798511006db1a` |
| Genshin 新来源 manifest pin | `7188b7cc12aaaf1cd5d91ee152915958b26f57a91b08efbf2f158895f6427f8d` |

实际观察 10 个 Worker；保护集为 Main、Main staging、Router、Genshin、NTE、Azur Promilia、Lvmeng 共 7 个，另只读观察 Router/Genshin/Azur staging。Genshin/NTE 的指南 HTML 属于各 game Worker，`/data/<game>/raw-guides.json` 属于 Main。每轮只写 `[game, main]`，Router/staging/其他游戏不属于发布目标。

本轮新增 **4 个版本上传、2 个成功部署 POST**，无恢复部署、无云写重试。连同 R31 历史共 **21 个版本上传、6 个部署 POST**；精确数量由 journal 与上传日志独立核验。生产 Git main 保持 `71a52728be2c9612d0b39be47092b7d85a320ac3`，两个 GitHub Cloudflare 部署变量仍为 `false`。不声称账户级已强制只有本机能部署。

两 owner 仍顺序切流，不是原子事务。releaseKey 固定候选/封存/日志/UUID，不声称普通应用请求全程注入 releaseKey 或完整 ReleaseMap 原子激活。P0–P7/T01–T12 全范围等级不整体提升。

## 3. 关键路径修复与真实耗时

R31 最后一次在最老证明约 925 秒时、首个 intent 前拒绝。本轮先剖析历史只读验证，不把历史链计时当实时授权：

| 测量 | 修复前 | 修复后 |
| --- | --- | --- |
| 同一完整封存链验证 | 112.56 秒 | 15.59 秒 |
| 文件读取次数 | 975,489 | 80,580 |
| 累计读取字节 | 40.70 GB | 3.81 GB |

`withVerificationPass`/`verifiedInPass` 仅在同步只读验证 pass 内去重并克隆结果，不跨 await、网络或写边界。预写拓扑等待与最终快照后重新校验，修改/到期仍拒绝；保留四版本、完整字节/身份/当前 UUID/拓扑及 **900 秒实时门禁**。未使用 mtime 缓存、历史 acceptedAt、自授权全局缓存或延长窗口。

五阶段完整重验实测 72.81 秒；控制面快照约 10–12 秒。执行前显式预算 490 秒、余量 410 秒，不保证未来网络时延。实际本轮：

- 候选上传/预览 637.46 秒，恢复上传/预览 321.61 秒；之后对同一四 UUID 重新续验，不使用过期批准推广。
- 新鲜续验 103.54 秒；正式推广 **202.16 秒**。
- Genshin/Main 两个 intent 时最老候选证明约 **96.85/134.24 秒**，公网接受时约 **245.64 秒**。
- source-advance 306.11 秒；新鲜授权仅用于本次推广，不因历史成功而允许下一次重放。

证据：`baseline-profile.json`、`optimized-profile.json`、`renewal-chain-profile.json`、`cloud-read-profile.json`、`critical-path-budget.json` 与 `attempt/publish-stage-times.jsonl`。CPU profile 只作计时诊断。

## 4. 失败证据保留与窄修复

准备阶段先后遇到只读超时与断流，目录 `evidence-preparation-da38ed5b79336aeb`、`evidence-preparation-7c6557fddd0633e6` 保留，均未上传。修复公共静态采样为最多 4 并发，只对自身超时或已识别断流允许一次完整新读取，记录每次尝试；HTTP 错误、外部取消、字节/身份错误及所有云写不重试。成功目录 `evidence-preparation-299df307d0fbdefb` 共 738 资源约 67 秒，该次没有实际重读。

NTE 首次真实只读交接失败目录 `~/.gachia-cms-releases/source-rebind-00c18accc717b8dc` 保留。NTE 121/Main 627 项精确预览已经通过，但登记阶段错误地再次比较历史公网 robots 缓存，实际精确预览 `/robots.txt` 是 noindex/deny-all，且不带 cache-control。不能要求它与公网 Allow/缓存/正文哈希相同。

修复只让 strictPreview 来源登记复用既有 `validatePreviewResponse`；robots 必须 noindex/deny-all，其余 status/MIME/cookie/cache/HTML/metadata/JSON-LD/media引用/静态字节及 HTML robots 校验保留。新增双游戏正例及登记/选择晚期漂移拒绝共 20 项回归，先红后绿。不覆盖已有或不完整固定 UUID 目录，不为 NTE 捏造 candidate/releaseKey，不使用最新代码冒充旧模块。

新只读目录为 `~/.gachia-cms-releases/source-rebind-404cab24e1b1bd20`，已登记 NTE `cb854ebe...` + Main `059971df...` 固定目录；manifest pin `07dd292b67a39e1940bb8848ca0a32c0a33dc89302f86d2d38dbdc7ead7a70d6`，source pin `9338ddaa1b72736d8c32b03ab6c8434ee646bfbd025b1d851c6388c7aa4aaad7`。返回 `sourceOnly:true`、`cloudWrites:false`、`newPublicationAuthorized:false`，来源交接不授予新发布许可。

## 5. 工程验证、安装与交付

- 本机完整测试：桌面 **784/784**、其他 Node **304/304**、Python **49/49**。CMS **165/165**、typecheck、Router/inventory 与完整发布测试通过精确代码 CI `41755021776`。
- 已安装发布器代码为 `287639e01767ff7bf6970bcdf55440f9a791c5fe`；25 发布模块 + manager + 2 TS helper 共 **28 文件**验摘要，CLI/导入/固定读目标 smoke 通过。该源码交付与冻结应用源码区分记录；不是重新部署 287639e 的应用。
- 安装未重启 CMS。发布前冷备 `20261104T000653Z-37242d` 曾短暂停启并恢复；最终 CMS/PG healthy、DB 摘要未变、9/9 安全 HTTP 与 28/28 安装完整性通过。本轮未重复 R30 应用恢复。
- 本报告交付前重新对账公众 HTTP、四版本回执、活动版本及 10 Worker/7 保护服务；文档精确提交 CI、main/部署开关和前轮封存完整性另存最终交付记录。

`delivery.json` 与 `evidence-index.json` 是本报告最终封存记录；`run-proof-index.json` 固定本次成功 run、来源 advance、新旧只读 rebind 与 catalog 的外部依赖，并验证 R31 的历史依赖索引。归档字节不称为新鲜历史代码下载；该证据不是自包含备份，不能删除依赖目录。R29/R30/R31 已封存文件不改写。

## 6. 剩余优先级

1. 下一条真实 NTE 既有指南编辑：从已验证的新 Main 来源另建 run，完整四版本/双 owner 推广与公网/source-advance，再只读反向交接 Genshin。没有真实编辑不制造文案、不清其他 hold。
2. 下一条独立 Genshin 编辑：验证正常连续发布，保留 Main 中另一游戏已公开 JSON，不重复本次 releaseKey 或已有恢复演练。
3. 独立 key 目的地具备时完成 C05b。目的地不需要运行 CMS；不擅自上传 key，不把同盘副本、R2 密文或授权文字当独立托管。

全类型/全 scope/其他 owner、普通请求全链 releaseKey、通用批量/调度/死信、权威接管与旧写入口退役仍属原始后续任务。内容事实校对和翻译属于上线后的持续优化，不重新加入首发门槛。
