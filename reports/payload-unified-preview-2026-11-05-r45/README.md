# R45 五目标精确预览合同与活动源身份

2026-11-05。接续 R44，完成本地精确预览 Host 合同、五目标版本身份工具与实际活动源对应核对。**没有升级常驻 CMS、上传候选/恢复版本或切换公众流量；“所有游戏所有内容均可正式更新”仍未交付。** 用户取消的公开内容来源认证不加入门槛。

## 实现

- `unified-version-preview.mjs`：独立五目标精确版本 URL、路径限制、完整 HTTP 验收与证据重开。没有放宽旧双游戏 `exactPreviewOrigin` 或发布 scope。
- `unified-html-fingerprint.py`：Python 标准 HTML 解析，比较正文、标题、标题层级、生产 canonical、description/OG/Twitter、链接、媒体、脚本/样式/base 引用及已有 JSON-LD。不强制非攻略页面存在 JSON-LD，忽略框架内联脚本及样式内容，不忽略外部资源引用。
- `unified-version-identity.mjs`：五目标不可变元数据读取、上传时模块回执/重验和 ETag 绑定的当前源模块捕获。HTTP 强 ETag、前后不可变元数据与外部 pin 的单模块字节同时校验，不能仅信 `/content/v2?version=UUID`。
- `assertUnifiedOwnerSettings`：五目标实际运行变量、service/environment tags、绑定/秘密名称、兼容配置和预览开关核对。绿梦明确 production，蓝色星原保留自身 service tag。
- `unified-preview-protocol.mjs`：支持五目标及 Main-only 的上传/inspect/preview 协议核心。显式非 fixture、审核记录变更与可信 verifier 是前置；独占 journal、恢复先于候选、单次上传、不可自动续跑、失败停机及只读对账。**没有生产适配器或 CLI，注入依赖只用于隔离协议测试，不能授权线上操作。**
- `unified:preview-local prepare|verify`：固定接收 R44 外部 pin，复用模块与只读资产，用真实 Worker 接收精确预览 Host，不经 DNS/TLS，不制造云 UUID 身份。失败目录不覆盖；独立复验重开上游和全部证据。

## 最终本地验收

[preview-02/preview.json](preview-02/preview.json) 的外部 pin：

`7531bd9c04d823da0327fb12a4a0c6429d4002099fe95a8ff210a390d1d513f0`

上游 R44 `transport-03` 的 pin：

`c4dada10737b73f903b912c96bd7efd0bbc54404fde7986a31d0515a6d42d0fd`

| Owner | 候选响应 | 兼容恢复响应 |
|---|---:|---:|
| 蓝色星原 | 203 | 203 |
| 原神 | 537 | 537 |
| 绿梦 | 199 | 199 |
| 异环 | 371 | 371 |
| Main | 1,268 | 1,268 |

最终批次共 **十个真实 Worker、5,156 响应**，含 4,254 条静态 URL、Main 两方向各 435 份公开 JSON。HTML 是每 owner 每方向一个代表性消费者，共 10 个响应，不等于全部 16 scope 的所有页面验收。JSON/静态/sitemap 保持逐字节；cache/cookie/MIME 保持原合同，HTML/XML/robots 均 noindex，robots 精确禁止所有抓取，不能夹带单独爬虫允许例外。原神 32 篇（含 `cms-returning-player-checklist`）及异环 53 篇攻略由上游完整校验继续保持。

所有本地结果仍为 `preview:true`、`syntheticVersion:true`、`cloudIdentityVerified:false`、`productionReady:false`、`activationSupported:false`、`cloudWrites:false`、`credentials:false`。这不是实际云候选/恢复预览。首次 `preview-01` 使用较窄资源引用合同，随后补齐脚本/样式/base 引用并另起最终批次；01 正文、日志和旧 pin 保留，但旧解析器 pin 不作当前合同的最终验收。

## 实际只读云观察

本轮使用既有账户凭据进行只读观察，并执行一次有 intent 的正常 OAuth refresh_token grant。轮换凭据只原子保存到原私人配置，scope 不变，没有归档/打印凭据响应，没有伪造过期时间或重试认证。此处不冒称整轮都没有使用凭据；无凭据承诺只属于上述本地 CLI。

[cloud-observation.json](cloud-observation.json)：58 次 GET，七服务拓扑前后一致，五目标活动 UUID、不可变版本元数据及实际运行配置均保持。该阶段没有断言历史模块字节对应。

[source-observation.json](source-observation.json)：30 次 GET 后按失败停机。蓝色星原通过 ETag/字节捕获；原神请求 `8c75bec6-f269-4684-9601-5cf9ca441fce` 时，下载 HTTP ETag 为 `ec78f7db...`，不是该 UUID 的 `3a65ee05...`，实际重现选择器返回其他版本的问题。失败 multipart、元数据和诊断完整保留，不自动重试，不给错误内容重新贴标签。

[source-handoff.json](source-handoff.json)：改用明确策略、56 次 GET，**五份活动恢复源模块全部对应通过**，七服务拓扑仍不变。蓝色星原复验已捕获证据；绿梦独立完成 ETag 绑定当前下载；原神/异环/Main 使用原接受日志中的固定 pin 原始上传回执，重开 archived multipart/模块、HTTP ETag、上传响应和前后版本元数据，再读取当前不可变版本核对。没有再次下载原神历史 content 接口。

source handoff 外部 pin：

`1d6cc3da8fba81760f7d89ad58731a5b939769086c563b8f4ca2499e486146d8`

整轮共 **144 次控制面/模块 GET、一次 OAuth POST、零 Worker/R2 上传及部署写入**。`verify-source-handoff.mjs` 已另进程重验所有模块/回执/拓扑 pin；它只确认封存完整性，不把旧观察时间刷新成当前状态。后续上传前必须再次取得新鲜拓扑、活动 UUID、运行配置和不可变身份。

## 验证与诊断

- CMS 全套 **260/260**；含新 CLI、精确 Host、来源逃逸、伪云/生产标记、解析器 pin 和失败状态拒绝。
- 根 `test:desktop-publish` **936/936**；新增相关四文件 **92/92** 是其子集，不额外累加。覆盖五目标配置、普通 HTML/JSON-LD、资源引用、ETag/错 UUID/元数据漂移、源码/回执篡改、Main-only、失败对账、并发与跨进程重试拒绝。已接入 `test:release` 和 `test:desktop-publish`。
- 文档/验证范围 **38/38**，CMS TypeScript、`git diff --check` 通过。没有 Git 提交/推送或实际远端 CI。
- 初次 TypeScript 检查发现请求函数类型过窄及返回类型推导问题，已修正；失败与最终日志分开保留。
- 首次外部预览复验遇到本地 Python 子进程 30 秒超时，未改 pin 或放宽合同，诊断保留；其他测试结束后单独复验通过，清理沙箱后再次复验。原准备流程内部复验同样通过。后续若频繁重现，应优化批量解析/运行资源隔离，不自动掩盖超时。

## 空间与下一步

仅清理本轮两个预览批次的 **22 个 `home` / `.wrangler` 沙箱，7.18 MiB 逻辑字节**，保留全部正文、日志、失败 multipart、源码身份和 R40–R44/历史 release/source/备份/密钥。清理时约 **31.80 GiB** 可用，不需要紧急删除历史工作台或内容。两批响应不复制资产树、没有重复构建五套应用。详见 [cleanup.json](cleanup.json)。

常驻 CMS 与公众仍 R39，账号关闭、IndexNow 暂停、单 Mac、无 Tunnel。下一阶段仍按正式交付主线：固定生产 verifier/上传适配器，接入真实 CMS 审核和非 fixture 候选，实际完成候选及兼容恢复云预览，再接受控推广、生产 partial 对账/source-advance。随后精确源码 CI、冷备/有界安装/显式迁移/held 导入及真实 CMS 内容批次。16 scope 逐类消费/引用约束、其他代码内联内容、全类型新增/结构/撤回/媒体仍未全部关闭。
