# 内容源与 Sitemap 契约

适用版本：S2.15。本契约覆盖主站 sitemap 所有权、Sea 派生物、七对受管原始镜像、原神攻略语言决策、平台页面元数据、Roco 限定公开入口/编辑归档与工具政策及原始文件全清单/待审/事实保留/撤回门禁；不表示全站内容事实或翻译质量已核验。第 17 节记录已确认的整游戏归属缺陷和生产阻断，修复前不能据本地内容门禁放行。

当前本地状态：90 对相等、pending 0、未决 holds 0；Roco 两项通过有证据保留和强制哈希合同的撤回结案，不是身份、玩法或图片权利认证。S2.14 之前的数量与阻断描述是阶段历史，最新规则见第 15 节。生产当前仍运行旧发布，本地放行不能解释为线上纠错已经生效。

## 1. 公开发现入口

| URL | 文档类型 | 所有者 |
|---|---|---|
| `/sitemap.xml` | `sitemapindex` | 主站；只列子图，不列页面 |
| `/sitemaps/main/sitemap.xml` | `urlset` | 主站页面和仍由主站承载的游戏 |
| `/sitemaps/{game}/index.xml` | 现有游戏子图 | 注册表声明的独立游戏 Worker |

当前独立 owner 为 genshin、nte、azur-promilia、lvmeng。根索引从 `packages/core/deployments.ts` 的 live/game 声明生成，不再维护第二份线上游戏列表。draft、preview、maintenance、retired 不进入根索引；缺少或重复的 live 子图地址会报错，不静默漏掉。

主站子图排除所有 `deployment: game` 的游戏，不论其状态。一个独立 owner 是否允许某个语言、某篇攻略被索引，由其自身 sitemap/robots/metadata 契约决定；主站不得再次提交该游戏页面来绕过保护。把子图从根索引暂时移除不等于删除页面，也不能替代该游戏自己的 noindex 或退役策略。

根入口仍为 `/sitemap.xml`，现有四个独立子图 URL 不改。Router 无须新增绑定或改写规则；根入口及 `/sitemaps/main/sitemap.xml` 都走 MAIN_SITE。人类阅读的 `/{locale}/sitemap` 页面不受本次 XML 路由迁移影响。

## 2. 遗忘之海攻略试点

权威工程输入：`packages/data/games/sea/raw-guides.json`。这表示派生链的输入位置，不等于其中每项历史事实已重新查证。

| 消费者 | 输入/输出 | 检查方式 |
|---|---|---|
| 攻略模块、首页攻略、详情辅助数据及 sitemap | 原始源；无文件系统时走 `/data/sea/raw-guides.json` | 原始镜像与源逐字段语义相等 |
| 攻略列表及详情推荐摘要 | `/data-client/sea/guides.json` | 从源移除正文三语言及 faq 后严格相等 |
| 攻略详情优化路径 | `/data-client/sea/guides/{id}.json` | 每篇与源中对应条目严格相等 |

S2.1 基线为 75 篇、77 个公开产物。没有把所有 Sea 数据、其他游戏、搜索索引或后台编辑器宣称为已纳入同一契约。现有搜索生成器未消费 Sea 攻略正文；静态新闻/推荐文案也不是本生成器的产物。

实现：`packages/data/scripts/sea-guide-contract.mjs` 同时提供纯派生函数、显式生成器和只读检查器。普通 JSON 对象键顺序与缩进不影响检查；数组顺序、正文、标题、日期及字段差异均影响检查。语义摘要使用 Node 的排序键 JSON 编码，不可与格式化文件的字节 SHA 混用。

### 编辑流程

在仓库根目录使用 Node 22：

```sh
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
# 编辑、核验权威源后，显式更新派生物；不改变源的业务日期。
pnpm --filter @gachia/data generate:sea-guides
pnpm --filter @gachia/data check:sea-guides
pnpm --filter @gachia/data test
pnpm --filter @gachia/web test
pnpm --filter @gachia/web build
```

源与公开产物必须同批审查、同批提交。`generate:manifests` 复用同一生成函数，不另外实现 Sea 攻略裁剪逻辑。生成器不会查询官网、决定哪个事实版本正确、补翻译或伪造 updatedAt。

只读检查存在于主站 build/preview/deploy/upload 的运行时前置入口、manifest 验证器及数据包测试中。Actions 在 `generate:manifests` **之前**检查已提交的产物，防止 CI 自动重生成掩盖漏提交。不要以 OpenNext 的 skip-build 或未受控手工 Wrangler 发布绕过主站前置检查。

缺失、非法 JSON、语义漂移都会失败。源中重复/不安全 ID、空正文在生成前失败。孤立详情文件也会失败；生成器保留它们，要求先审核退役、引用和历史保留规则，不能自动清空目录。S2.1 未删除任何游戏正文或历史资产。

## 3. 本地编译后验收

`node scripts/runtime-rollout-smoke.mjs web` 使用现有隔离本地 Worker，验证根索引发现主站子图，再从主站子图检查实际阅读 URL。继续执行原有无账号、资源、404、交互/延迟脚本/无 JavaScript 桌面移动端回归，不把索引改造当成跳过原门禁的理由。

已启动本地 Worker 时，可使用标准 XML 解析器验收：

```sh
pnpm audit:sitemap-contract:local --origin http://127.0.0.1:PORT
# 若有旧 URL 清单，必须声明证据性质，不能把重建结果称作线上抓取。
pnpm audit:sitemap-contract:local --origin http://127.0.0.1:PORT \
  --before-json /absolute/path/to/old-entries.json \
  --baseline-kind runtime-assets-reconstruction \
  --output /absolute/path/to/report.json
pnpm test:release
```

旧清单格式为 `[{"url":"https://gachia.com/zh"}, ...]`。检查器只访问显式 loopback origin 的根图和主站子图，不自动访问四个生产游戏、不跟随重定向、不使用系统代理。检查 XML namespace、根结构、canonical origin、重复 URL、主站/游戏 owner 边界及旧 URL 移除原因；未知移除立即失败，没有“全部忽略”的开关。XML HTTP 类型也必须正确。

本地 fixture 无真实云端缓存绑定，必须区分源码求值、Next 预渲染、ASSETS 回退和实际生产 HTTP。S2.1 发现的 roco-cn 源/镜像缺条已在 S2.2 闭合：保留中日文历史归档，英文继续退役；Next 预渲染和本地编译 Worker 的 URL 集合均为 4,464 条且完全一致。这不代表已核验当前生产缓存或全部独立游戏子图。

完成 OpenNext 构建后执行 `pnpm test:managed-content:local`，自动启动隔离本地 Worker，检查五份 raw JSON、三份搜索索引、XML、归档/退役发现路径及三语言代表页面，覆盖 1440/390px。S2.6 扩展至 64 个浏览器例，保留官方声骸名称/效果、未知二件套、来源、推荐撤回及列表点击，新增鸣潮区域三语言展示和洛克首页/版本/日历撤回；主站 CI 在封存前复用此检查。脚本不接受远程 origin 或其他 CLI 参数，不使用生产数据库、认证密钥或云端绑定；浏览器阻断外部请求，证据保留于 `.release-records/managed-content-*`。它不能代替原有 `runtime-rollout-smoke` 和生产发布门禁。

S2.7 扩至七份 raw JSON、三份搜索和 148 个浏览器例：新增九篇 Roco 攻略、三只角色的三语双尺寸正文/FAQ/元数据/索引检查，以及列表的全部相关卡片和实际点击。主站本地清单变为 4,436 条，仅移出这些实体原有的 28 条（zh/en 各十二、ja 四），新补日文清单不进入索引；详情继续 200。外部 CDN 被 fixture 阻断，不将本地通过解释为生产图片可达或身份核验。真实发布仍须比较当天完整云端 sitemap 并集。

## 4. 受管原始镜像

固定注册表为 `packages/data/scripts/raw-mirror-contract.mjs`：wuwa/raw-redeem-codes.json、skjh/raw-guides.json、roco-cn/raw-guides.json、wuwa/raw-echoes.json、wuwa/raw-regions.json、roco/raw-characters.json、roco/raw-guides.json，合计 111 条记录。前三对 S2.2 的归并依据是既有提交及保守状态处理，不是新一次官方事实审核。声骸在 S2.5 经三语言公告核对与不明数值/推荐撤回后纳入；区域在 S2.6 经公告摘录及不明归属撤回纳入；Roco 两对在 S2.7 撤回选定断言后纳入，仍有独立事实 hold，不能将受管视为已核实。

声骸的新三条保留 ID/URL，使用官方中英日名称和五件套原文，新增来源范围说明；`bonus2pc` 允许缺失，由访问器输出本地化未知提示，不从其他套装填值。推荐置空不是不适配结论。三语言搜索与实际列表/详情使用同一名称；较旧 12 条并未在本批重新认证。详见 [S2.5 逐字段决策](../plans/multi-game-s2-5-official-echo-closeout-2026-10-24.md)。

```sh
# 审核源及历史差异后，显式生成；检查命令自身不写文件。
pnpm --filter @gachia/data generate:raw-mirrors
pnpm --filter @gachia/data check:raw-mirrors
pnpm --filter @gachia/data verify:manifests
```

生成器先验证全部受管输入的非空数组及唯一 id/code，再写受管镜像；不删除文件，不复制未受管的数据，不选择事实权威，不刷新业务日期。检查器拒绝缺失、非法 JSON 和语义差异。manifest 生成器复用相同实现，主站运行时前置检查和 CI 生成前检查均接入此门禁。不得先运行生成器再以检查通过证明原提交无漂移。

退役规则集中在 `apps/web/lib/retired-pages.ts`，同时约束 middleware、详情渲染/静态参数、首页与攻略列表、相关推荐、主站 sitemap、hreflang 和语言切换。`/en/roco-cn/guides/daily-events-merchant-guide`（含末尾斜杠）仍为 404；同步公开原始 JSON 不等于恢复英文阅读或索引。中日文归档保留原正文/FAQ 和 2026-09-07 日期，以标题、摘要及正文告知其历史适用范围。

兑换码的历史 active 状态还需通过到期日判断；日期型到期值按 UTC 当日结束，带时区时间保留其语义。公开日不是核验日，不能用 revealedAt 或固定回退日期显示“最后核验”。历史分类与工程同源检查均不证明当前兑换成功。

## 5. 原神攻略语言契约

独立 owner 使用 `apps/game-genshin/lib/guide-policy.ts`，统一决定详情阅读语言、metadata、hreflang、FAQ 与独立 sitemap。覆盖范围仅为攻略，不自动改变角色、武器、圣遗物等资料页的语言策略。

- 标题、摘要非空且对应正文去空白后至少 80 字符，才具备该语言的工程索引资格。只有日文标题/摘要不算完整翻译；长度检查也不等于翻译质量、时效或事实审批。
- 缺译详情保留原 URL 和 200 阅读，显示请求语言的原文提示及原文页面入口，整段标题/摘要/正文优先一致回退英文，其次其他完整语言，不拼接“日文摘要 + 未标识英文正文”。正文、FAQ 区域及 Article/WebPage 的 inLanguage 声明实际阅读语言。
- production 缺译页为 `noindex, follow`、自身 canonical；其他完整语言的 hreflang 不宣称这个缺译页是译文。完整翻译页保留正常索引资格。非 production 一律 `noindex, nofollow`，不弱化原有预览保护。
- sitemap 不再提交缺译详情，但列表仍保留并标识原文回退，避免删除玩家阅读入口。日文 FAQ 仅输出有完整日文问答的条目，页面与 FAQPage 使用同一集合；不在日文正文下冒充日文显示英文 FAQ。

S2.3 基线 31 篇攻略：zh/en 各 31 篇，ja 仅 `lightrace-wish-phase-ii-faq` 具备正文。独立 sitemap 源码清单 1,602 → 1,572，仅移出 30 条缺译日文详情；本地 Worker 与 Next 预渲染的 URL 集合严格相等。公开 Router 入口仍为 `/sitemaps/genshin/index.xml`，本地独立 Worker 的验收入口为 `/sitemap.xml`，未改 Router 或部署声明。

```sh
# 先完成对应应用 OpenNext 构建；原神构建需显式 production 模式并准备双路径静态资产。
pnpm test:seo-discovery:local web
pnpm test:seo-discovery:local game-genshin
node scripts/runtime-rollout-smoke.mjs web
node scripts/runtime-rollout-smoke.mjs game-genshin
```

新 discovery 工具只接受上述应用参数，内部启动隔离 loopback Worker，不接受远程 origin；通过标准 XML 解析器核对实际清单，并在 1440/390px 验证缺译、部分译文、完整译文、canonical/robots/hreflang、实际正文和 FAQ。证据位于 `.release-records/seo-discovery-*`。原有远程 `genshin-seo-parity` 是旧版本等价迁移工具，strict 模式可能因这次有意的缺译页 title/description 改动失败；不能关闭 strict 或重新加入假译文来获得通过。真实发布须审查差异并建立相应候选基线，本地工具不替代云端发布验收。

## 6. 平台元数据与首页路径

首页、关于、联系、隐私、条款通过 `apps/web/lib/platform-metadata.ts` 提供自身 canonical、三语言/x-default、对应页面的 Open Graph/Twitter 标题描述和 URL，避免继承中文根级分享文案。原有正文、政策日期及 URL 不变。

三游戏状态数据的 href 为不含语言前缀的站内路径，由国际化 Link 添加一次 locale；首页、更新雷达和下一步选择器使用同一状态标签表，post-test 必须显示“测试已结束”，不得落入“待开服”。独立 owner 仍复用 S1 的原生跨 Worker 导航保护；不为修重复前缀而修改整个 Link 的语义。

主站 CI 在安装浏览器之后、封存产物之前运行 `pnpm test:seo-discovery:local web`；只复用现有构建，不新增构建任务或云端环境。未在本批启动 Actions。原神的本地 discovery 命令已可复用，但尚未接管历史远程迁移工作流。

## 7. 原始文件全清单与待审内容保护

`packages/data/raw-content-review.json` 显式登记 90 对 raw 镜像和 5 个仅源文件（四份角色摘要及独立蓝色星原角色源），由 `packages/data/scripts/raw-inventory-contract.mjs` 扫描双方目录并比对。S2.7 为 90 对相等、pending 0，但 Roco 角色/攻略两份源各有事实 hold；仅源边界不是漏生成，也不允许自动新增主站镜像。

pending 绑定双方完整文档的语义 SHA-256、实体与字段差分、原因及可读取的审查文档；未知漂移、文件增删/非法 JSON、符号链接、待审值改变或静默同步都会失败。对象键顺序/空白不影响摘要，数组顺序影响。普通相等项允许审查后的同批源/镜像更新，新游戏文件须登记全清单。检查器只读，不联网、不自动更新台账、不批准内容。

`holds` 与 `pending` 独立：前者记录尚未关闭的事实/适用范围风险，不要求镜像不同；后者专门记录已知漂移。hold 也绑定双方完整语义摘要、原因、状态和可读 plans 审查文档，禁止未知路径、重复路径、非法状态/摘要或空原因。即使双方同时改成相等新内容，旧 hold 也会阻断工程检查。精确快照可供本地构建/隔离审查；生产要求两种未决项均为零。变更或关闭 hold 必须附逐项内容决策，不能只刷新摘要让检查变绿。未登记 hold 的其他相等文件也不因此取得全站事实批准。

```sh
pnpm --filter @gachia/data check:raw-inventory
# S2.14 本地应通过；旧 holds 的撤回证据仍是必经检查，不能删除合同绕过。
pnpm content:release-ready
```

工程检查接入现有应用前置脚本、manifest 生成前/验证、CI 生成前和测试；精确已知 pending/holds 允许开发/build/staging 审查，不把未知差异当警告。主站 deploy/upload 先执行 `--release`；主站 production workflow 在昂贵构建前及真正推广前重复执行，pending 或 holds 非零即失败。独立游戏不因主站已知未决项被统一阻断，其既有生产保护仍生效。手写底层 CLI 可绕开仓库检查，不属于受支持发布方式，门禁不是云端权限控制。

S2.7 撤回三只角色从国服复用的技能/数值和旧描述，把九篇攻略改为三语主题核验清单；标记 `contentReview.status=needs_verification` 的详情保持 200、自身 canonical、noindex/follow，无 hreflang，也不进入 sitemap。角色不再展示星级/属性/编号/进化/栖息地断言，未知数值不以零代填，详情使用“形象待核实”占位而非确认旧立绘身份。攻略不展示硬编码快速回答、下一步、相关文章及配图，九篇对应的旧快速回答/下一步配置同时移除并归档，避免撤标记后复活旧承诺。列表仍可读可点击且显示纠错后的标题/状态，不将无证据视为测试取消。编辑纠错日与游戏核验日分开，noindex 也不保证搜索引擎立即移除已有收录。

这不是整个 Roco 的隔离：保留的历史身份/分类、另外三只角色、二十一篇攻略、强度榜和首页/下载/地图等文案仍需审查；其他游戏历史相等数据也未全量重审。详见 [S2.7 决策、验收与后续门槛](../plans/multi-game-s2-7-roco-content-closeout-2026-10-24.md)和 [S2.4 结案流程](../plans/multi-game-s2-4-content-review-closeout-2026-10-24.md)。

## 8. 区域资料与错误来源传播

S2.6 复用 S2.5 已捕获的中英日官方 3.7 响应，核对梦枢天罗的名称、简介、七个场景及仅适用于部分玩法的地图奖励进度说明。未重新抓取网络或把历史公告称作现行版游戏内核验。场景使用各语言原名，由区域访问器到地图适配器真实渲染；较旧五区原数据、列表隐藏策略保持不变，不标为已核实。未知 Boss/无音区/特产的区域归属暂不列出，说明未列出不等于不存在，保留 ID/锚点和三语来源。英文公告区域段的 Heartt 拼写未被悄悄当成编辑的官方纠正，入场提示不重复该标题。

洛克旧 Steam 来源身份错误的影响扩展到首页推广、版本快照/页面/元数据/FAQ 和两组日历条目：撤回确认日期和官方源等级，不通过新填日期/改时区制造倒计时；快照可显式缺日期并展示“日程尚未核实”，来源类型为 needs_verification。编辑纠错日不是游戏公告或开服日。活动页解释暂不分类不代表取消，保留原条目到决策报告，不删除历史证据。

S2.6 定位的九篇攻略在 S2.7 已撤回确定断言，原文/FAQ/角色源与镜像原值均留存；不是取得新的官方事实依据，也不证明全部旧说法都来自同一错误 Steam 引用。剩余二十一篇及其他公共入口仍待核验，较旧五个鸣潮区域也未在本批复核。不能因为 raw pending 清零或已翻译三语就放行生产。

## 9. Roco 公开入口与列表政策

S2.8 将待核实详情扩展至六只角色及十三篇主题清单，撤回全部国际服 A/B 评级，不用默认 B 或零分填补未知；国服数据不变。首页、tier-list、download、map 的三语主题文案来自 `apps/web/lib/roco-public-review.json`，元数据和 sitemap 共用 `isRocoPublicPageUnderReview` 精确匹配政策：仅国际服四个入口保持 200、自身 canonical、noindex/follow、无 hreflang，退出 XML，不扩大为整游戏删除。未来增加需隔离入口时，应同步文案、路由政策、浏览器断言和 XML 差分；禁止恢复已归档的排名/下载/报名承诺。

角色和攻略列表仍可索引及点击，标题/description/计数说明改为历史记录与资料审核目录，不用通用 SEO 扩写冒充已核实的技能/配装资料。角色卡片仍需身份/图片核验；攻略精选只展示已纠错核验清单，撤下国际服每日行动工具推广，国服行动区保留。全局中性导航仍在，不代表其他工具已经批准。列表告知剩余文章未完成审核，而不是误用详情的“本页暂不提交索引”声明。

本地 Main XML 4,436 → 4,410，仅移除 26 条原已提交 URL，无新增/owner 变化，与实际 Worker/预渲染集合相同；这是本地候选差分，不是生产收录量。两个事实 holds 继续绑定本批明确撤回后的完整语义快照，未关闭。剩余十七篇文章、工具、注册表说明和六只历史身份仍待审，详见 [S2.8 决策与验收](../plans/multi-game-s2-8-roco-public-scope-closeout-2026-10-24.md)。

## 10. 编辑设想不等于玩家事实或站内需求

S2.9 将十七篇面向游戏开发方的历史产品建议从玩家攻略身份中分离。完整三语原文、FAQ、SEO 字段与旧推荐配置保存到内部决策档案，不发布进 public；原 URL 保持 200 和主题归档说明，不改 ID/顺序/原 updatedAt，不重定向或假 404。十三篇既有核验清单保持原数据，全部角色 raw 字节不变。

`contentReview.kind=editorial_proposal_archive` 与有效 `status=needs_verification` 共同区分归档身份，不能解释成事实已核验或需求已采纳。详情沿用自身 canonical、noindex/follow、无 hreflang、不入 XML；归档说明使用“编辑归类日”，Article 编辑时间不冒充游戏核验日期。列表适配器传递该状态，归档另分分类，卡片标识原文日期；精选仍只列清单，旧十七个推荐块移除并归档。目录本身仍可用可索引，不把整个游戏都删除。

当前三十篇详情均暂停索引，目录区分十三篇清单和十七篇归档。恢复玩家资料必须重建来源/区服/版本证据，恢复评论文章须重审受众与分发；内部建议只有经过新需求审查才能进入开发计划，不得因保存原文自动恢复登录、增加遥测或接管游戏客服。两个事实 holds 保留，其他工具、注册表与历史身份仍待审。详见 [S2.9 交付记录](../plans/multi-game-s2-9-roco-editorial-separation-closeout-2026-10-24.md)。

## 11. 国际服工具与 TS 输入边界（S2.10）

国际服属性、蛋、商人及法杖的实际输入还有 TS 常量/函数，不全部经过 raw。raw 武器空数组不能证明代码中的旧十条已核实。四栏目和十个已知历史法杖详情保持三语 200、自身 canonical、noindex/follow、无 hreflang，并从主站 XML 暂停提交；未知详情 key/多余路径仍 404，不按整个游戏通配返回占位页。

属性查询必须传区服；国际服与无效属性返回 null，不能默认 1 或 0。国际服蛋、商人、法杖事实集合均为空；这表示撤回旧断言，不表示官方不存在此类系统。历史法杖 URL key 与物品事实集合分开，通用 data 导出、列表/metadata/detail 适配器不再复述旧稀有度/外观/赛季与获取方式。包含页脚与三语来源文案在内的十三份修改前完整源保存在内部决策档案，不进入 public/ASSETS。

共用页脚不再笼统声称全部数据来自游戏客户端，而是明确本站非官方、来源/版本/核验状态须逐页核对。此项全站来源说明不表示已完成所有页面事实审查或图源授权；不能在正文撤回后由外围文案继续背书。

共享路由标签为限定审核页追加三语审核说明，GameNav、Breadcrumbs、注册表访问器及平台 CTA 复用；核心路由开关只表示本站可访问栏目，不能证明游戏功能已实装。国服数组/144 个旧倍率和页面保持原行为，不称为本批事实确认。185 个 raw、345 个 client/manifest、核心注册表与原始审核台账逐字节不变，两个 holds 继续阻断生产。验收记录见 [S2.10](../plans/multi-game-s2-10-roco-tool-boundaries-closeout-2026-10-24.md)。

## 12. 历史角色地址与事实集合分离（S2.11）

国际服六个历史地址不是已确认阵容。`packages/data/games/roco/character-review.ts` 只从历史 raw 提取 ID，附带编辑审核状态；公开投影不携带旧名称、属性、稀有度、编号、图片或机制。通用 `characters` 导出明确为空，不能用零星级、猜测属性或“国际服”默认发行版本凑成已验证角色。今后恢复需显式审查新来源、版本与各字段，不以删除审核标记自动恢复。

列表、摘要、详情和 metadata 使用三语“历史条目 + URL key”；key 仅用于地址追溯，不是官方名称。卡片和详情使用文字占位，不请求历史立绘，也不以游戏 OG 图片替代角色身份依据。平台首页的三条旧角色推荐和六套休眠角色 SEO 断言已撤下，完整修改前源码留在内部档案。六个已知详情仍为三语 200、自身 canonical、noindex/follow、无 hreflang、不入 sitemap；未知 key 和多余路径为 404。历史目录仍可索引，不把整个游戏屏蔽。

兼容源接口 `rocoCharacters`、`getRocoCharacterById`、`getRocoCharacterDescription` 仍可读历史记录，不应作为公开或事实批准接口。旧名称/图片 helper 已保守退回中性名称/空图片；公开消费者改读字段受限投影。核心注册表仍保留旧元素/稀有度配置，不代表实装或事实批准；国际服类型工具、评级、角色列表不据此生成事实。国服行为不变，也不代表本批新核验。

原始角色及公开 raw 镜像仍含带审核标记的历史字段；三个本地静态图片也未物理删除，直达地址可能仍被 ASSETS 提供。停止主动展示不等于获得图源授权、清除所有历史分发或搜索缓存。文件名、文件存在、哈希、构建通过均不能证明角色身份和使用权。本批未取得新官方依据或授权，两个事实 holds 与原始绑定不变；禁止据投影隔离自动放行生产。历史 IndexNow 手工脚本仍有旧详情 URL，未执行，需另批统一提交政策。详见 [S2.11 决策与验收](../plans/multi-game-s2-11-roco-character-identity-closeout-2026-10-24.md)。

## 13. 提交候选、XML 命中与事实批准分离（S2.12）

IndexNow 的两个手工 CLI、站内 API 和 server-only helper 不再独立外发。共同策略为显式暂停：CLI 默认离线计划，`--submit` 拒绝；API 保留认证与输入校验，合法认证请求返回暂停 503 而非通知成功；helper 保留兼容接口但只验证/记录。未将暂停替换成环境变量开关，也未取消 secret 要求。

历史优先 URL 集合保留为待比较候选，不悄悄删除后称作审核通过。新增页面必须显式提供候选，不再从新增共享模板乘以全部游戏/语言。可传入多个本地 XML urlset 快照，由标准 XML 解析器校验格式、命名空间、地址、重复项及预算并记录摘要；没有隐式抓取、根索引递归或整站来源批准。计划区分命中、未命中、未评估，全部 `submissionAllowed=false`。只提供主站文件不能断言独立 owner 的未命中 URL 已退役；命中主图的兑换码页仍可能有待纠错文案。

暂停属于本站发现/推广流程的保守策略，不声称 IndexNow 协议禁止发送 noindex 或删除通知，也不代表撤销旧提交或已改变生产行为。恢复需另批补齐生产版本、全部 owner、HTTP/正文/语言/robots/canonical、来源审批、用途及发送结果合约，不能用关闭 holds 或翻一个标志自动放行。见 [维护说明](indexnow-offline-planning.md)。

## 14. 兑换码审核与禁用物品入口（S2.13）

国际服 `roco/redeem-codes` 使用共享审核政策：三语言 200 纠错说明、自身 canonical、noindex/follow、无 hreflang、不进入主站 sitemap。页面在读取兑换码数组前进入审核分支；将来添加 raw 条目也不能自动恢复公开兑换码。旧日期、报名优先级、平台资格、奖励类别、数量卡片及“官方来源”标签已从可运行模板移除，修改前完整源码内部留档。不得把空 raw 解释为官方有效码为零、系统不存在或测试取消。

核心注册表禁用国际服 items，但路由开关不是 HTTP 防护。既有中间件曾把该列表 301 到游戏首页，编译验收发现后，仅国际服 items 绕过这条重定向，由页面和 metadata 显式 `notFound()` 返回 404；无语言路径先规范化至中文同路径；国际服没有已支持的详情或静态参数，未知详情继续 404。此处不是纠错历史文章，不把 Coming Soon 作为完整材料图鉴提交索引；也不扩展成其他游戏的全局禁用策略。已导出的版本摘要旧 items CTA 改指兑换码撤回说明，不让导航指向此 404。

国服 items 列表/详情与兑换码独立保留，本批没有重新核实其中的事实。审核导航与面包屑使用共享标签，已存在的首页推荐撤回及版本状态继续适用。主站 XML 仅减去国际服兑换码的三个语言 URL；物品列表原本不在清单中。原始数据、公开 raw、派生 manifest、历史图片和两个事实 holds 均不因本批自动批准、改写或删除。恢复页面需独立来源/身份/区服/版本与领取条件审核，并成套恢复内容、元数据、导航、XML 和回归；不能只删除提前返回或 noindex。见 [S2.13 交付记录](../plans/multi-game-s2-13-roco-redeem-items-closeout-2026-10-24.md)。

## 15. S2.14 撤回结案合同

`packages/data/roco-publication-resolution.json` 明确记录 `withdrawn_not_verified`，由 raw inventory 无条件检查已注册的 Roco 两份文件；不是可选的事后报告，也没有为旧 hold 增加忽略开关。合同实现为 `packages/data/scripts/roco-publication-contract.mjs`。

- 六条角色记录只允许 `id` 和 `contentReview`；不补零值、不伪造 verified、不再将精简记录断言为完整 `RocoJinie`。旧结构仅作为历史类型保留。
- 两份当前 raw 的源/镜像都绑定完整语义摘要；基线 JSON 和旧 hold 台账在 `reports/content-integrity/archive/s2-14/` 原字节保存。旧摘要必须匹配真实历史 holds；移除记录、错误状态、篡改原始证据、静默改动两端和审核文档缺失均失败。
- 30 篇文章逐项保留 13 份核验清单和 17 份非官方设想归档，不保留可执行游戏承诺。仅调整 `jinies-guide` 三语过时的“保留名称/图片导航”措辞；原日期和其余 29 篇不变。详情的 noindex/follow、canonical、无 hreflang 与 XML 排除不因结案撤销。
- 三张国际服原图移出 public，原始字节保留。遍历发布目录按图片指纹拒绝重命名别名；仅允许原本已存在的三个独立国服路径，不修改国服图片，也不宣称其来源或使用权已新核实。编译验收另外检查 ASSETS 文件清单和国际服直达 GET/HEAD（含查询参数）404，不能只靠 middleware 隐藏图片。
- 国际服核心分类、稀有度和数值名称注册表置空，不把 12 类或 3/4/5 星继续输出为国际服规则；其他游戏的注册表完整对照不变。旧首页角色计数撤除，国服通往国际服的文字改为核验说明，版本摘要的设想链接标注归档而非上线承诺。

历史阶段测试继续对归档快照验证原先的保留约束，新增当前公开字段白名单、两端一致改动拒绝、历史证据/图片指纹和归档状态回归。旧名负向浏览器检查从原始档案取输入，不因公开 JSON 删除名字而退化为空循环。

这是限定内容的安全发布形态，不是全站事实批准或永久冻结。未来新增游戏事实需要独立来源、适用区服/平台/版本、审核人和成套页面/镜像/派生物/索引验收；显式审查后才能更新合同。历史证据不得随意覆盖。证据目录不进入站点发布产物，但不承诺 Git 历史或仓库托管本身属于保密存储。

## 16. 后续推广与回退

- 90 对原始 JSON 全部一致、pending 0、未决 holds 0；Roco 两项已按撤回结案，保留原始审计基线，不把工程归并/撤回当成事实重新认证。skjh 公开镜像中的四篇运营修订已完整回迁源，未以旧源覆盖。
- 扩展下一游戏前，先确认官方事实/区服/日期和退役 URL，再把源、镜像、页面语言与 sitemap 作为同批变更验收。
- 真正发布前仍需受控 staging、根索引及全部子图 HTTP、正文与语言契约、静态资产保留、生产回滚版本和 Actions 预算核验。单元测试或本地 XML 通过不表示已上线。
- 回退必须审查完整代码及派生物组合，不能仅回退原始源或一份公开镜像。S1 静态资源保留与无账号策略继续适用；不得恢复登录、覆盖其他 Worker 或删除保留证据。旧线上版本仍含已发现的 Roco 风险，回退 UUID 不是内容安全认证；优先前向修复，紧急恢复旧版本须同时处置已知内容回归，不能无条件长期停留旧版。

## 17. S2.15 发布前阻断补充（2026-10-24）

完整公网迁移差分发现：原有“独立游戏的整个 URL 前缀都归游戏 Worker”假设不成立。
Router 的 NTE_DETAIL_PAGES 不包含 items，57 个物品详情的三语共 171 个 URL 仍由 Main 回退承载；线上三语抽样均为可索引 200、自身 canonical，使用 Main 静态资源。
现有 Main 子图和 XML 合同整前缀排除 NTE，独立子图也不收这些详情，会导致发现路径遗漏。
因此本文历史上的整游戏 owner 约束不能作为上线批准依据；当前实现尚待修正，不通过改成 noindex 或删除数据来迁就它。

S2.15 增加封存前 fallback 覆盖门禁，以真实材料库导出期望 URL，当前明确拒绝 171 个遗漏，阻止正式上传；受管内容测试/撤回合同通过不覆盖这项失败。
下一阶段应将路径级所有权合同用于 Router、导航和 sitemap，保留真实 Main 回退并更新 XML/测试；之后才能放行。
蓝色星原六个重复 loc 已本地修复，但线上未部署；同样不能用读到 200 的子图豁免重复。
详细证据与后续顺序见 [S2.15](../plans/multi-game-s2-15-release-preflight-2026-10-24.md)。
