# 全游戏现有内容编辑契约

更新：2026-11-06，R47。目标是把现有内容的维护从双游戏攻略扩展到所有注册游戏；本契约不是全站正式接管声明。

用户已明确：作为玩家论坛，不要求公开内容来源认证或资料权威性审批。`community-editorial-v1` 将 `factualSourceApprovalRequired` 和 `publicSourceAttestationRequired` 均设为 false。读取当前公开内容是为了防止覆盖线上增量，不是重新引入来源认证；文件 SHA、版本/权限、构建、资源兼容和恢复检查仍属于工程安全要求。

## 已实现的编辑链路

- 复用 Payload `content-records`、用户、审核权限、编辑锁和版本历史，不新建第二套 CMS。
- 当前版本化 inventory 的 16 个技术 scope、115 个数据来源进入覆盖检查。可生成 2,795 个编辑单元，含独立记录及具名区块，不是 2,795 篇文章。
- 覆盖 raw JSON 的现有角色、武器、装备、材料、地区、攻略、兑换码、配装等字段，以及四个独立应用 `data.ts` 的字面量内容；额外读取 `tier-lists.ts`、`progression.ts` 的独立字面量输入。
- 纯数据提取使用已有 TypeScript AST 白名单，不执行被读取的模块。派生函数、外部导入、调用表达式不伪装成已迁移内容。
- 原神、异环 raw 攻略委托给已运行的 `desktop-guides-v1`；四份角色摘要委托给现有生成器。不会生成另一个可编辑副本。
- 榜单输入按完整具名区块保存。原始重复行、顺序和缺译保持，不能为了凑唯一键而去重或编造身份。

这是保留源结构的编辑合同，不是各领域最终的语义 schema。合法元素、数值区间、配装/材料关系和页面资格仍须各领域校验，不能用 JSON 类型正确代替业务正确。

## 保存与审核

统一记录用 `unified:` 命名空间，身份由游戏、来源路径、符号和稳定行选择器决定。导入由受控 Local API 执行；普通 REST 包括管理员也不能伪造来源创建统一记录。

`sourceRecord` 是不可变来源信封，保存来源字节摘要、原值摘要和定位信息；编辑使用 `structuredValue`。`game`、`kind`、旧身份、定位路径和来源信封不可变。统一记录不能另填攻略 `title/body` 制造两个内容版本。

本阶段允许已有叶子值更新，保留对象键集合、JSON 类型和数组长度。身份、来源/审核证据、媒体/权利等字段禁止直接改写；新字段、增删记录、结构变更和媒体替换须单独合同。新文字拒绝 HTML 起始标记、危险协议和控制字符，不能据此省略实际页面安全验收。

所有导入为 held 草稿；不把旧资料自动标为已审。editor 只能存草稿，reviewer/admin 才能正式审核和解除 hold。之后修改结构化草稿会重新 hold，已批准版本不随较新的草稿变化。删除统一记录被拒绝，审核下架也不等于网站撤回。

重复导入验证来源信封，不改人工编辑、批准或版本。来源修订变化要求显式 rebase；按游戏使用事务，中途失败不会留下该游戏的半批导入。不能用重新导入重置已编辑内容。

## 候选导出

`exportUnifiedContent` 对固定原始 O、当前公开 A、CMS 编辑 B 作字段三方比较：B 未改的字段保留 A，独立修改合并，同字段冲突或记录缺失拒绝。数组是原子比较单元，不按位置拼接不同版本。

必须提供所有原始来源的当前基线，包括本次未编辑游戏及委托来源。所有 A 相对 O 的变化都进入冻结构建 overlay，保留已公开但 Git 中没有的文章；不是只保留被编辑的单行。没有新的实际编辑时状态为 `no_changes`，不能借保留 overlay 重发旧内容。

JSON 保留全部字段；TypeScript 只替换目标字面量初始化表达式，保留类型断言、导入及读取代码，并重读验证值相等。输出是不可变候选文件和绑定原始/当前/候选 SHA-256 的清单，不修改源码仓库、公众镜像或 Worker。

当前候选始终 `productionReady:false`、`activationSupported:false`。镜像/派生生成已在下一节的隔离冻结链路接通；正式激活还需要业务/引用校验、精确 owner 构建、页面/索引/资源验收、兼容恢复和受控推广。现有双游戏发布器不接受这种新合同，不要求公网来源认证。

## 冻结源码与派生数据

`freezeUnifiedContent` 已把候选接入独立的固定源码树：显式指定 40 位 Git 提交，对全部 115 份导入 O 验 SHA，先检查原有 raw 审核台账，再把完整 A 与本批 B 放入同一份隔离源码。工作区未提交的文件不会混入；没有新编辑、缺少 A、来源不匹配、未知记录、路径链接或目标目录已存在时拒绝。

按现有 raw 台账映射公开镜像，不为 source-only 文件发明公网入口。复用现有角色摘要、manifest、搜索索引、榜单客户端和 Sea 指南生成器，并执行生成后检查。先重算 A 的摘要并核对原值；公开摘要与公开角色不一致时要求显式对账，不能借生成器抹掉 A。原台账未结审核/hold 也不能靠自动同步关闭。

受影响目标包括保留 overlay 的所有游戏：12 个 Main-only scope 映射 Main，四个独立游戏映射自身和 Main；不能只按本批 CMS 记录挑目标。完整 A 原文、最终源码逐文件 SHA（包括二进制媒体）、派生修改清单和 manifest 均保留 pin，`verifyUnifiedFrozenSource` 可重读检查篡改。

冻结回执仍为 **generated_source_only**，输入 A 标记 `sourceAuthentication:not_required_by_operator`。回执不授权云端发布；构建和页面消费由独立的 `unified_owner_build` 回执描述，完整领域/引用校验与正式激活仍未完成。

## 公开基线与多目标构建

`unified:baseline --commit <40位提交> --pin <计划SHA256> --output <新目录>` 不访问数据库，不需要云端凭据。按现有 raw 台账 GET `https://gachia.com/data/...`，要求正常 JSON、成功状态、无 cookie、有界响应与超时；90 个公开输入与代码输入、派生摘要共同组成完整 115 来源基线。公开读取失败时不静默改用旧 Git，以免丢掉线上文章。代码内内容使用明确选定的 Git 值，不标成经过外部权威认证。

`unified:build-local --directory <冻结目录> --pin <冻结回执SHA256> --expectations <JSON>` 在固定源码中离线安装并逐一构建四个独立游戏及 Main。异环选 live，绿梦显式选 production 环境。每个目标都要有实际编辑值的正文断言；本地 Worker 检查页面、sitemap、robots、响应类型和 cookie，Main 另逐份验证公开 JSON 与关闭的账号 API。请求语言与页面路径一致，不携带登录 cookie。

蓝色星原原有 raw 角色名表没有被角色页读取。冻结编译现用 `projectAzurRawNames` 将 raw 名称接到既有角色模型；仅接受精确核对过的代码与完整、唯一的已有角色集合，不改技能/档案资料，不执行来源代码。它是构建投影，不另建名称编辑副本。

`unified:verify-local --directory <冻结目录> --pin <构建回执SHA256>` 重读来源树、所有目标产物、HTTP 正文/头、完整路径集合与正向修改断言；部分失败、缺失目标、篡改或无外部 pin 都不能当成功。构建失败保留状态且不自动覆盖重试。每个成功目标自动移除本轮 `.next`/`.open-next` 中间文件，保留封存产物和验收证据。

`unified:smoke-local` 用随机隔离 SQLite 导入完整计划，通过真实 editor/reviewer 权限编辑、审核并重读五个 published 测试版本，再生成 `preview:true` 的不可推广产物。本地测试通过不代表常驻 CMS 已升级或公众已更新。实际结果与失败记录见 [R42](../reports/payload-community-publication-2026-11-05-r42/README.md)。

## 多目标资源兼容与恢复

`unified:publication-local` 接收已通过的 `unified_owner_build` 和显式 pin 的旧产物清单，将每个目标生成候选/恢复两个独立产物，不改原构建、旧产物或数据库。目标严格来自原构建，不接受 Router、隐式 all 或漏掉 Main。此入口是本地发布准备，不是旧双游戏云执行器的绕行入口。

旧清单要求 `schemaVersion:1`、`kind:unified_previous_artifacts`、`purpose:local_compatibility_only`，`owners` 必须与构建目标完全一致。每个 owner 提供 `service`、`versionId`、`.open-next` 的 `directory` 与 `artifactSHA256`，以及旧 Worker multipart 的 `modulePath`、`archiveSHA256`、`moduleSHA256`。产物 pin 是 `artifactFiles` 清单的两空格 JSON 加末尾换行的 SHA-256。模块必须符合现有单 `worker.js` multipart 合同。清单只说明本地字节完整性，不冒称旧版本仍在线；后续上传前还要实时核对版本身份和运行配置，不是内容来源认证。

两方向只合并 Next 静态资源：新运行时保留旧资源，旧运行时保留新资源。其他 HTML、公开 JSON、server cache 不能跨版本复制。资源同名但字节不同直接拒绝，不能覆盖；四个独立游戏的原始/游戏命名空间 URL 必须成对且字节相同。支持实际构建中的 JS/CSS、字体、JSON 与图片，拒绝链接、路径逃逸和超预算文件。恢复 Worker 来自显式 pin 的旧 multipart，不执行任意另填的历史源码。

Main 的恢复产物必须与冻结 A 的 90 份 raw 公共镜像逐字节相符，不能拿旧 Git 替代当前已公开内容。恢复正文断言与候选覆盖同一组页面、同一顺序；候选验证新正文，恢复验证旧正文。每个角色逐项请求全部新旧静态 URL、sitemap、robots 和内容页，Main 另请求所有公开 JSON 与关闭账号 API，检查状态、MIME、cookie 和字节摘要。

```sh
pnpm unified:publication-local prepare \
  --build <冻结构建目录> --build-pin <构建回执SHA256> \
  --previous <旧产物清单JSON> --previous-pin <清单SHA256> \
  --baseline <原正文断言JSON> --output <新目录>
pnpm unified:publication-local verify \
  --directory <上述输出目录> --pin <publication.json的SHA256>
```

本地 Worker 复用执行工作区已安装工具，要求锁文件与冻结源码相同；不会重新构建应用或在旧冻结目录里重装依赖。保留 8 GiB 磁盘余量，并先计算复制预算。失败保留状态，任何已有输出目录都拒绝自动覆盖/续跑。独立 verifier 重读全部输入、两方向精确文件集合、运行配置和完整 HTTP 证据，不信任 caller 的通过标志，也不接受部分成功。

R43 已实际运行五目标共十个 Worker，5,156 个响应通过；候选和恢复各覆盖 2,127 条静态 URL，Main 两方向各验证 435 份公开 JSON。原神 32 篇（含 `cms-returning-player-checklist`）及异环 53 篇攻略两方向字节相同。见 [R43](../reports/payload-unified-recovery-2026-11-05-r43/README.md)。本次候选仍是 R42 测试 fixture，必须保持 `preview:true`，不得上传或正式推广。

`unified_local_publication` 始终 `productionReady:false`、`activationSupported:false`、`rawUuidRollbackAuthorized:false`、`cloudWrites:false`。真实旧运行时加新资源的本地通过不等于云恢复已验收，也不授权直接回退原 UUID。统一精确版本云预览、推广/partial 对账/source-advance 仍待接入，原双游戏云发布器的范围守卫不变；首批常驻接入见 R46。

## 精确模块封存

`unified:transport-local prepare|verify` 接受上述本地发布回执与外部 pin，目标必须与原构建完全一致。此入口只执行无凭据 `versions upload --dry-run` 和本地 Worker，不提供上传/推广命令，不读取账户密钥，也不把历史 UUID 当成新鲜云身份。

候选从 R43 资源兼容产物打包一次，提取唯一 `worker.js` 到独立 `module/`；恢复先把旧封存模块逐字节复制到同类目录，禁止重新打包。两方向各再做一次 `no_bundle:true`、`minify:false` 的实际 dry-run，核对单模块字节与 multipart 元数据。SQL/HTML 等旁带模块、额外绑定/秘密值/asset JWT、非空 annotations、意外运行配置均拒绝。单模块目录不接受额外文件，也与会被写入的日志/HTTP 证据隔离，避免触发热重载。

Main 保留 staging 声明和 `cf:service=gachia`；蓝色星原保留 staging 声明和自身 service tag；原神/异环移除环境声明以保持既有空 grouping；异环运行 live。绿梦保留环境声明并显式选择 `production`，使用 production 变量及 service/environment tags，不能取同名服务的顶层 preview 变量。每个配置均经已安装的固定版本 Wrangler 实际解析及其标签函数核对，不把本地解析冒称云控制面验证。

封存回执绑定 Wrangler launcher/CLI 字节、冻结来源配置、两次 multipart、运行配置、调用参数/日志和全部 HTTP 响应。独立 verifier 重新验证 R43 全部输入/资产，再重开这些证据；缺失、篡改、部分失败、目标遗漏或 preview 降级均拒绝。封存后的实际模块使用同一组新正文/恢复旧正文、全部静态 URL、Main 公开 JSON 与关闭账号 API 断言。复用 R43 的只读资源树，不再次复制五套资源或重建应用。

```sh
pnpm unified:transport-local prepare \
  --publication <R43发布准备目录> --publication-pin <publication.json的SHA256> \
  --output <新目录>
pnpm unified:transport-local verify \
  --directory <上述输出目录> --pin <transport.json的SHA256>
```

所有输出仍为 `productionReady:false`、`activationSupported:false`、`cloudWrites:false`、`credentials:false`；原有 `preview:true` 必须传播，fixture 不可转为正式发布。失败目录不覆盖或自动续跑；磁盘预检保留 8 GiB，成功后只可清理本轮 Wrangler 沙箱，保留模块、multipart 和 HTTP 证据。执行结果与失败诊断见 [R44](../reports/payload-unified-transport-2026-11-05-r44/README.md)。精确候选/恢复云预览、实时拓扑/运行时身份、受控推广仍是后续工作；首批常驻升级见 R46。

## 精确预览合同与身份

`unified:preview-local prepare|verify` 接受 R44 传输回执和外部 pin。它只复用封存模块与只读资产，使用真实 loopback Worker 和精确 `workers.dev` Host，不请求 DNS/TLS 云预览、不读取凭据、不上传或推广。两个方向覆盖 R44 的完整 HTTP 路径集合；独立 verifier 重开上游、正文、响应头与解析器 pin。结果显式为 `syntheticVersion:true`、`cloudIdentityVerified:false`，不能当作云版本证据。

```bash
pnpm unified:preview-local prepare \
  --transport <已封存传输目录> --transport-pin <transport.json SHA256> \
  --output <新目录>
pnpm unified:preview-local verify --directory <预览合同目录> --pin <preview.json SHA256>
```

HTML 通过 Python 标准库 `HTMLParser` 解析，不使用正则剥标签作为内容模型。比较标题、正文、标题层级、canonical、description/OG/Twitter、链接、媒体和脚本/样式/base 引用及存在的 JSON-LD；只忽略框架内联脚本与样式内容，不强制普通内容页存在攻略 JSON-LD。JSON、sitemap 和静态资源逐字节核对，保留 MIME/cache/cookie 边界；HTML/XML/robots 要求 noindex，robots 必须精确禁止全部抓取，不能夹带特定爬虫例外。

`unified-version-identity.mjs` 独立支持五目标不可变版本读取、上传时模块封存及重验。`content/v2?version=UUID` 不可仅凭选择器信任：HTTP 强 ETag 必须等于前后不变的版本元数据，模块还须与外部 pin 的封存字节一致。历史接口返回其他版本时停机留档；有原始上传回执的目标可重验该回执和当前不可变元数据，不能重新给错误下载贴历史标签。活动 UUID 与七服务拓扑也须单独实时检查。

`unified-preview-protocol.mjs` 是无 CLI 的协议核心，固定生产适配器见 R47 小节。它按显式 owner 集合先验恢复、再验候选，支持 Main-only，使用独占 journal、单次写入、失败停机和只读对账，不含切流/自动回滚。注入依赖只用于协议测试，不是用户提供 JSON 就能获得的生产授权；实际云候选/恢复预览与推广仍待完成。R45 实际云观察/失败/源码对应和最终本地证据见 [R45](../reports/payload-unified-preview-2026-11-05-r45/README.md)，有时效的旧观察必须在未来云写前重新核对。

## 数据库迁移

`20261105_063243_unified_content` 仅添加 `content_records.structured_value` 和版本表对应 JSONB 列。没有在线 schema push、表重建或旧记录覆盖。

空字段可在隔离测试中 down/up 验证；只要新列或版本历史存在内容，down 会拒绝删除。应用回退应保留增量列，不能用 schema downgrade 清掉新编辑成果。R41 首先在隔离 PostgreSQL 验证；R46 已经真实数据库副本演练、冷备和显式常驻迁移，旧 85 条内容及版本保持，详见下节。

## 桌面接入增量（R46，执行中）

新增独立 manager 动作 `unified-import`、`unified-export`、`unified-freeze`。只有 settings 指向的当前安装应用可连接桌面库；从 checkout 或另一个暂存应用调用会拒绝。原 `unified:import-local` 等 SQLite 实验入口保持原限制，不能用设置 desktop 环境绕过。

导入要求 `--repo`、完整 `--pin` 和单一 `--scope`，按游戏事务创建 held 草稿，重复导入只验来源，不覆盖编辑。正式导出要求 `--repo`、`--pin`、`--selection`/`--selection-pin`、`--active`/`--active-pin`；选择 JSON 只能包含 `stableKeys`，1-200 条，不接受传入正文或批准标记。冻结再要求精确 `--commit` 与新 `--output`。不提供 preview、force、token 或云目标参数。

正式选择读取实际 published、hold=false 记录，核对来源计划及 game 关系；后续未批准草稿不会替代已批准值。准备前后核对批准摘要，漂移即拒绝。成功输出 `editorial.json` 绑定选择、公开 A、批准值和冻结回执；仍明确 `productionReady:false`、`activationSupported:false`、`cloudWrites:false`，不因桌面导出就允许云推广。安装和实际执行状态以 [R46](../reports/payload-desktop-unified-2026-11-06-r46/README.md) 为准。

R46 实际安装源码 `7b12684262338511bbcc2d3468bacaeff9a2404a` 已通过完整 GitHub CI。常驻显式迁移后原有 85 条内容、版本和媒体未变，711 份应用文件及 184 份附加 release 文件验 pin，旧应用与原发布器保留。首批仅导入无限大 65 个 held 草稿，总内容数 150；通过真实认证 REST 修改并批准下载指南的中文 `content`，其他 149 条记录、其他字段和语言保持。正式导出与冻结候选摘要一致，不是隔离 fixture；公众仍 R39，尚未统一云上传或推广。

当前冻结 owner 合同按全部 O→候选 overlay 计算，因保留原神/异环的公开 A，首批实际为 `genshin → nte → main`，不能标成 Main-only。后续固定生产验证器必须明确真实 A→B 编辑与 A 保留 overlay 的边界；不能删掉公开增量或绕过 owner 守卫来缩小批次。

## 固定生产预检（R47）

`unified:production audit-local|audit|upload-previews` 与无凭据本地准备入口分离。请求 JSON 只允许 `schemaVersion:1`、`kind:unified_production_preview_request`、`repo`、六个 `{path,pin}` 输入（`localPreview`、`editorial`、`selection`、`active`、`application`、`sourceHandoff`）及精确 `sourceRunID`/`executorRunID`；拒绝 verifier、transport、skipCI、临时 owner 和推广标记。命令显式传 `--request`、`--pin`、新 `--output`，只有上传预览另需 `--release-key`。

本地预检用 `GACHIA_CMS_REVIEW_TOKEN` 读取固定 `http://127.0.0.1:3100` 正式审核，不传入数据库配置或记录正文；核对实际游戏/来源、published/hold、审核摘要，重新三方编译，要求全部候选与原冻结一致。安装路径必须仍由 settings 指向，源码清单与冻结提交逐字节匹配，应用/build ID 及附加 release 文件重新验 pin。准备前后正式审核不变。`audit-local` 不接受云凭据获得权限，输出仍不可激活。

完整云预检还要求两个精确提交的完整 CI，包括未跳过的 CMS/发布工具/公共消费者与类型检查；执行器代码必须已提交且字节一致。使用 `CLOUDFLARE_API_TOKEN` 只读重取七服务拓扑、活动 UUID、绑定、预览设置及原始模块证据的当前不可变元数据。旧 source handoff 仅作 pin 入口，不能充当新鲜观察。上传入口固定调用上述 verifier 和适配器，按正确 environment 执行封存 no-bundle 模块，只允许候选/兼容恢复精确云预览；没有部署/切流命令。

`unifiedEditorialScope` 已区分本批 A→B 与 O→B 保留 overlay，当前真实审核为 Main 编辑、原神/异环保留。分类不自动缩减上传 owner，`preservationOwnerOmissionAuthorized:false`；只有另行证明活动运行时已完整承载公开 A 才能跳过。独占 journal、上传时强 ETag/不可变模块、完整精确云 Host HTTP 与独立重验保持，未知结果不重试、只读对账。实际工程/诊断见 [R47](../reports/payload-unified-production-2026-11-06-r47/README.md)，目前没有统一云上传或推广，原双游戏守卫不变。

## 开发入口

在 `services/content-cms` 执行：

```sh
pnpm unified:plan
pnpm exec tsx --test tests/unified-content.test.ts tests/unified-payload.test.ts
pnpm exec tsx --test tests/unified-build.test.ts
pnpm typecheck
```

`unified:plan` 不启动数据库、不写内容。`unified:import-local --pin <当前计划SHA256>` 和 `unified:export-local --pin <当前计划SHA256> --active <完整基线文件> [--preview]` 必须设置独立的 `CMS_LOCAL_ONLY=1`、临时 secret 和 `CMS_LOCAL_NAMESPACE=unified-*`。这两个命令目前明确拒绝常驻 desktop 模式，不要绕过保护指向真实数据库。

基线文件是 `{sourcePath,text,sha256}[]`，包含完整来源集合；SHA 用于完整性校验，不要求公网来源认证。正式导出读 published 版本和 `hold=false`，preview 才能读较新的草稿。输出在该隔离 namespace 的 `candidates` 下，已存在目录不会覆盖。

`unified:freeze-local --pin <当前计划SHA256> --active <完整基线文件> --commit <40位提交> --output <已存在父目录下的新目录> [--preview]` 沿用同一隔离 SQLite 限制，不安装依赖、不启动 Worker、不调用云端；复制源码前检查空间预算并保留 8 GiB 余量。输出父目录必须是无符号链接的实际路径。失败保留独立诊断，自己的中间 tar 自动移除；测试完成删除自己的临时源码，不删除历史发布目录。构建与独立 `typecheck` 应串行运行，避免 Next 重建 `.next/types` 时出现瞬态缺文件。

## 剩余边界

页面 TSX 内联事实、其他尚未适配的代码内容、实体新增/撤回、字段结构扩展、媒体替换、全类型语义与跨引用、其余 scope 常驻接管和全 owner 正式发布仍未完成。首批常驻安装与真实审核不等于所有游戏已可上线。下一顺序见[实施队列](../plans/payload-all-content-implementation-2026-11-05.md)。
