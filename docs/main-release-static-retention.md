# 主站发布：旧静态资源保留与生产验收

## S2.19 实际发布与下一次来源限制

2026-10-25，Main 已更新为 `c0615321-071d-4f44-b635-70dbdba117c2`，实际产物 `12571493654`，ZIP 摘要 `ee750c335f49ce18bea4ff184e8dcd7d16b271f160f4c3c8161133ca46f671ee`。同一封存产物先 staging 完整通过再推广，独立完整生产复验、359 个 JS/CSS 及旧 262 文件字节验证通过。但运行 `40121743063` 的生产后检出现未复现 JS 请求失败，deploy job 和整个 Actions 仍为 failure，不能假称 workflow 成功。

因此，这个已验证的当前产物**尚不满足现有 `prepare-previous-web-assets.mjs` 对成功 deploy job 的自动来源要求**。下一次发布先建立受控只读复验与原版本/产物/部署日志绑定的证明闭环，不删除 success 条件简单接纳失败 run，不改用本地重新构建包充当旧来源，不为变绿再部署相同产物。证据、失败和明确后续工作见 [S2.19](../plans/multi-game-s2-19-main-production-2026-10-25.md)。

## 目的与边界

主站部署会替换静态资源集合。仍打开旧页面的用户可能继续请求旧 chunk，因此“新首页返回 200”不足以证明发布安全。本规则仅保留当前生产构建的 `.open-next/assets/_next/static/`，不引入旧 Worker、HTML、数据库、服务端缓存或配置，不改变四个游戏 Worker 与 Router。

这是主站发布门禁，不是合并 Worker、恢复账号或自动清理历史文件的授权。当前版本的账号接口应为 404 + `ACCOUNT_FEATURES_DISABLED`，而非旧版的 session 200。

S2.4 增加前置内容门禁：正式准备发布前先执行 `pnpm content:release-ready`。S2.14 将最后两项 Roco 阻断按**完整撤回、非官方认证**结案：角色 raw 仅保留历史 URL 标识与审核状态，三张国际服原图移至非发布证据目录，30 篇文章仅发布纠错清单/归档说明；原始文件、旧台账与图片原字节保留，撤回合同绑定原始和当前摘要。当前本地内容门禁通过，但不等于生产发布批准。本地 deploy/upload 与 production workflow 的检查均保留，删除撤回记录、恢复旧字段/原图、两端同时改动、丢失证据或增加未登记图片别名仍会失败。不得只同步待审文件、刷新摘要或清空台账获得通过；需按[内容契约](content-source-and-sitemap-contract.md)完成字段/区服/语言审核。这个门禁不代替本页的静态资源、生产版本和回滚保护；本页后续步骤仅在内容门禁通过后适用。

三张图片与现有国服图片字节相同；国服独立路径原样保留，不作为国际服身份依据，也没有因此取得新的来源/使用权认证。撤回范围是国际服关联、国际服 URL 与未登记字节别名，不是删除互联网上所有同图。此前用户缓存、旧浏览器页面、历史 GitHub 产物和版本仍可能保留旧信息，不能宣称追溯清除。

## 生产输入与可信链

正式发布仍通过 `.github/workflows/deploy.yml` 的手动 production 入口，要求 main ref、`RELEASE_MAIN_ONLY`、production environment job 和当前 100% 活跃版本。environment job 只有在仓库配置了保护规则后才提供人工审批，不得仅凭存在 environment 名称就声称已经审批。新增两个显式输入：

- `previous_web_artifact_id`：产生当前线上版本的精确 GitHub artifact ID；同 commit 的不同运行不能互换。
- `previous_web_artifact_sha256`：GitHub artifact ZIP 的 SHA-256，不是 ZIP 内 `web-worker.tar.gz` 的摘要。

`scripts/prepare-previous-web-assets.mjs` 只读取固定仓库的 Actions API，确认 artifact 未过期、摘要一致、来自本仓 main，并核对成功 deploy job 日志中的 artifact ID 和 `Current Version ID`。下载后再次核验 ZIP 摘要，不执行旧产物里的代码。build job 仅增加 `actions: read`；生产 deploy job 不获得这项额外权限。

GitHub runner 的 `gh` 版本可能比本地更新。读取部署日志/ZIP 时按 `gh api --help` 检测是否支持 `--allow-escape-sequences`，仅对固定白名单中的这两类机器载荷启用，输出始终捕获在管道中，不展示原始控制字符或二进制。日志去除终端控制序列后再核验对应关系；ZIP 字节保持不变再校验摘要。普通元数据不使用此开关，旧版 CLI 不传不支持的参数。

旧资源只能来自可证明对应当前线上版本的产物。过期、找不到对应日志、混合流量版本或线上版本漂移时停止，不从任意 commit 重建来冒充原始产物。

S2.14 在 2026-10-24 只读复核主站仍为 `80d20cea-4407-4ece-a87c-30f27c915021` 的 100% 单版本；实际下载并验证产物 `12509287773` 的摘要、成功部署日志及版本关联，在本地候选保留 262 份旧静态资源。这是当天证据，不是之后发布可复用的永不过期授权：每次正式运行仍须实时重新检查。候选未上传、未执行云端 staging 或生产切流。具体状态见 [S2.14](../plans/multi-game-s2-14-production-candidate-2026-10-24.md)。

## 产物顺序

1. 正常构建、测试及应用运行时检查。
2. 下载精确旧产物；安全提取静态目录，先验证全部路径、链接、重复与文件/目录冲突，再写入新临时目录。
3. 合并旧静态资源；相同路径必须字节相同，否则视为不可变资源冲突，停止，不覆盖候选文件。
4. 生成非公开 `retained-web-assets.json`：记录来源、文件路径、大小、SHA-256 和 Worker 入口摘要；验证产物可移植性。
5. 封存一个不可变 tar，staging 与 production 下载同一 artifact ID 并验证同一 tar 摘要；中途不重建。
6. 两次部署前均核验保留清单。production 请求的 staging 作业对最多 12 个旧资源 GET 校验字节，优先覆盖 webpack/CSS，并为下载的编译产物执行当前无账号契约的 32 项 HTTP、18 场景浏览器验收及 8 项跨 owner 浏览器夹具检查；不能用 build 作业的 dev-server 测试替代。失败阻断 production，并保留失败记录；这不意味着执行了所有历史 chunk。
7. production 写入前再次读取当前部署，确认回滚 UUID 仍为唯一 100% 活跃版本；保留证据后才能发布。

### S2.15：内容和 XML 的云端验收

staging 入口增加 `verifyPublishedManagedContent`，与本地编译验收共用内容断言，覆盖三语双尺寸 508 个浏览器场景、23 个 HTTP 边界、7 份 raw、3 份搜索及旧资源字节抽样。固定允许主站 staging 与正式域名，拒绝凭据、查询、路径及任意 origin。原 `verifyManagedContent` 仍只接受显式 loopback，不放宽本地夹具规则。远端不发送合成 trusted-IP 或 IndexNow token，不使用真实密钥；仅做无凭据 IndexNow 401 拒绝测试。暂停依据是封存代码中不存在外部 transport 加本地认证夹具，不宣称远端已完成认证后暂停测试。

`web-published-sitemap-audit.py` 解析 XML 并检查封存产物中主站 index/子图 URL 集合与云端相等，再遍历四个独立 owner 的实际生产子图，检查命名空间、重复、owner 分区、子图引用、循环/深度及响应预算。staging 的 Main 来自 staging，独立 owner 仍来自生产，报告分别标记，不能解释成四个游戏候选也部署到 staging。预览 XML 要求 noindex，生产 XML 拒绝 noindex。脚本不接受任意 origin，不修改 Router。

正式推广后再执行无账号 HTTP/运行时浏览器和同一内容检查，以及完整生产子图并集检查；发现问题使发布运行失败，但不会自动回滚至带有旧内容风险的版本。staging 与 production 的结果 JSON/完整子图报告无论成功失败都通过独立 artifact 留存 30 天；没有改变同一制品、摘要复查和不重建规则。

2026-10-24 实际预检发现两个问题：蓝色星原生产子图 156 条含 6 个重复项；Main 候选按整款游戏排除 NTE，漏掉实际仍回退 Main 的 57 个物品详情的三语共 171 个 URL。前者已做本地修复但未部署；后者尚待路由级归属修复，不能把“独立 NTE 没有详情路由”误写成“公网没有详情”。线上抽样实际仍是可索引 200。

生产 build 在封存前新增纯本地 fallback 覆盖检查，当前必须以 171 个遗漏明确失败，阻止任何 staging/production 上传；远端 XML 入口也先执行同一前置检查。raw 内容放行不等于此发布门禁通过。先修路由级所有权及 XML 合同，保留 Main 实际承载的详情；或另行取得明确迁移/退役决定并验证全过程，不得删 guard、清空数据或整款游戏豁免。这个临时显式 guard 应收敛为 Router、导航、sitemap 共用的路径合同，不再扩展成散落例外。

随后再完成蓝色星原独立来源/产物/回滚审查及 staging、生产验收，核对其他 owner 未变，才推进 Main；参见 [S2.15 交付与发布顺序](../plans/multi-game-s2-15-release-preflight-2026-10-24.md)。严格检查继续拒绝两项未解决的线上/候选依赖，不用基线豁免获得通过。

### S2.16 本地修复进展

上述“171 条缺失”属于 S2.15 的历史阻断。S2.16 通过共享路径合同恢复其实际 Main 归属，重新构建后覆盖门禁为 required 171 / missing 0；新 Main XML 为 4,515 条，较 S2.15 本地候选只增加这 171 条。XML 验收同时拒绝独立 owner 越界及未批准的 Main 回退，门禁没有删除或放宽。完整说明见[路径合同](content-source-and-sitemap-contract.md#18-s216-路径归属与索引许可分离2026-10-24)及 [S2.16 交付](../plans/multi-game-s2-16-route-ownership-2026-10-24.md)。

复用 S2.14 已核实来源的旧生产 ZIP/静态集合，重新检查 ZIP 摘要、复制并验证全部 262 个旧静态文件，不复用旧 HTML 或服务器代码。这是本地候选准备，不是重新读取了当前生产版本；正式发布仍必须实时复核当前 UUID、精确 artifact、期限、main 漂移及预算。该阶段没有执行任何云端发布验收或部署；蓝色星原独立发布依赖和其余迁移差分不能因 Main local gate 通过而视为完成。

共享受管内容验收增加全部 171 个详情的 HTTP/HTML 检查，以及首尾物品三语、双视口共 12 个浏览器用例，验证自身 canonical、index/follow、Main 资产、源中的现有名称与返回独立目录的文档导航。staging 要求全局 noindex，正式域拒绝全局 noindex，页面 metadata 检查与预览索引隔离不混淆。这些断言已接入原有本地及受限云端入口，不另开绕过封存制品的发布通道。

本地预备入口（执行前先完成生产版本/产物对应关系核验）：

```bash
PREVIOUS_WEB_ARTIFACT_ID=<artifact-id> \
PREVIOUS_WEB_ARTIFACT_SHA256=<github-zip-sha256> \
ROLLBACK_VERSION=<currently-active-main-uuid> \
node scripts/prepare-previous-web-assets.mjs
node scripts/retain-web-assets.mjs verify <currently-active-main-uuid>
node scripts/retain-web-assets.mjs staging <currently-active-main-uuid>
pnpm test:release
```

`staging` 命令固定访问既有主站 staging，不接受自定义 origin。预备命令会下载历史 ZIP 到被忽略的 `.release-records/`；失败记录和既有封存产物不自动删除。

## 有界保留与运营成本

- 单个历史 ZIP / 内层压缩 tar 各不超过 128 MiB；展开内容不超过 512 MiB / 50,000 条目；选中静态文件不超过 64 MiB / 5,000 个。超预算失败，不静默截断。
- 正式 production 构建 artifact 在 GitHub 保留 30 天；一般验证/staging 仍为 7 天。此变更会增加已有 Actions artifact 存储用量，但不会在本地提交时创建付费资源。
- 30 天不是永久备份。发版间隔可能超过此窗口时，应提前保全当前线上封存产物及可信部署证据，并单独评审恢复入口；当前脚本不接受本地 ZIP 绕过 GitHub 对应关系核验。
- 上一代资源可能已经包含更早一代文件，因此递归保留不会自动形成严格两代窗口。达到预算前须按版本清单、访问/缓存窗口与回滚依赖提出 GC 预演；本功能不做自动删除。
- 原有发布产物、回滚记录和业务数据继续受保护。将来清理须先提供引用保护、备份及人工批准，不以“减少磁盘占用”为由删除唯一证据。

## 验收与回退

主站通用链接从 `lib/i18n/navigation` 导出受 owner 约束的 Link：根据游戏部署注册表，指向独立 live Worker 的链接输出原生 `<a>`，不发起 Next RSC 预取；仍由主站负责的路由保留 next-intl/Next 客户端导航。语言、查询参数、片段、样式、ref、用户事件及浏览器新标签行为保留，不通过取消默认点击或强行 `location.assign` 模拟。此主站包装器不支持旧式 `as` 路由别名；需要添加时必须同时验证别名的实际 owner，不能绕过导航边界。已存在的搜索结果原生链接保持不变。

回归包括四款独立游戏的桌面/移动浏览器点击与返回，断言没有预取、只有文档请求且新文档不继承主站状态；三语言 HI3 仍验证同 owner 客户端导航。不要只断言“最终到达了目标页”，Next 的 chunk 失败后整页降级也可能满足这个弱断言。

`pnpm audit:production` 保持固定正式域名、GET、手动重定向和无凭据；根据源码账号策略核验 session 响应，同时检查五个页面 owner、各自 JS/CSS 命名空间和四个游戏 sitemap。任一失败使审计失败，不通过改变 DNS、WAF、TLS 或登录策略制造通过。

发布前还应完成三语言主站 Worker/浏览器检查、桌面/移动跨 owner 硬导航与返回、旧页面资源字节抽样和非主站版本对账。真正生产发布后须重跑审计并观察错误率；staging 成功不等于生产已验收。

失败时先判断实际线上故障、验收工具问题及兼容版本组合；需要回退时由操作人评审已记录的旧 UUID，不迁移数据库、不回滚其他游戏 Worker。旧版可能恢复已撤回内容或账号入口，不能因为后检失败自动整包回退；必要时保留纠错补丁。平台回退引用可读不等于已演练回退；上线计划需明确观察窗口和操作人，不为避免旧版风险贸然删历史数据或 secret。
