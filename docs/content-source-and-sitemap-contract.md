# 内容源与 Sitemap 契约

适用版本：S2.5。本契约覆盖主站 sitemap 所有权、Sea 派生物、四对受管原始镜像、原神攻略语言决策、五类平台页面元数据及原始文件全清单/待审门禁；不表示全站内容事实或翻译质量已核验。

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

完成 OpenNext 构建后执行 `pnpm test:managed-content:local`，自动启动隔离本地 Worker，检查四份 raw JSON、三份搜索索引、XML、归档/退役发现路径及三语言代表页面，覆盖 1440/390px。S2.5 扩展至 40 个浏览器例，含官方声骸名称/效果、未知二件套、来源、推荐撤回及列表点击；主站 CI 在封存前复用此检查。脚本不接受远程 origin 或其他 CLI 参数，不使用生产数据库、认证密钥或云端绑定；浏览器阻断外部请求，证据保留于 `.release-records/managed-content-*`。它不能代替原有 `runtime-rollout-smoke` 和生产发布门禁。

## 4. 受管原始镜像

固定注册表为 `packages/data/scripts/raw-mirror-contract.mjs`：wuwa/raw-redeem-codes.json、skjh/raw-guides.json、roco-cn/raw-guides.json、wuwa/raw-echoes.json，合计 69 条记录。前三对 S2.2 的归并依据是既有提交及保守状态处理，不是新一次官方事实审核。声骸在 S2.5 经三语言公告核对与不明数值/推荐撤回后纳入；剩余 roco 角色与 wuwa 区域两对仍不自动同步。

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

`packages/data/raw-content-review.json` 显式登记 90 对 raw 镜像和 5 个仅源文件（四份角色摘要及独立蓝色星原角色源），由 `packages/data/scripts/raw-inventory-contract.mjs` 扫描双方目录并比对。当前为 88 对相等、2 对待审、4 个差异实体；仅源边界不是漏生成，也不允许自动新增主站镜像。

pending 绑定双方完整文档的语义 SHA-256、实体与字段差分、原因及可读取的审查文档；未知漂移、文件增删/非法 JSON、符号链接、待审值改变或静默同步都会失败。对象键顺序/空白不影响摘要，数组顺序影响。普通相等项允许审查后的同批源/镜像更新，新游戏文件须登记全清单。检查器只读，不联网、不自动更新台账、不批准内容。

```sh
pnpm --filter @gachia/data check:raw-inventory
# 当前因两对 pending 预期退出 1；输出 engineeringReady 与 contentReleaseReady 的不同状态。
pnpm content:release-ready
```

工程检查接入现有应用前置脚本、manifest 生成前/验证、CI 生成前和测试；精确已知 pending 允许开发/build/staging 审查，不把未知差异当警告。主站 deploy/upload 先执行 `--release`；主站 production workflow 在昂贵构建前及真正推广前重复执行，pending 非零即失败。独立游戏不因主站已知 pending 被统一阻断，其既有生产保护仍生效。手写底层 CLI 可绕开仓库检查，不属于受支持发布方式，门禁不是云端权限控制。

待审值并未从历史源或所有页面隔离：roco 角色静态导入原始源，区域有 source/public 回退，仍不能宣称争议内容已经下架或生产当前与镜像相同。详见 [S2.4 结案流程、来源核对及边界](../plans/multi-game-s2-4-content-review-closeout-2026-10-24.md)。待审关闭必须记录字段采用/纠正/撤回依据、区服/语言/版本范围并同批归并，禁止仅改哈希或清空 pending 放行。

## 8. 后续推广与回退

- 90 对原始 JSON 目前 88 对一致、2 对待审：roco 角色、wuwa 区域；保留原始审计基线，不把工程归并当成事实重新认证。skjh 公开镜像中的四篇运营修订已完整回迁源，未以旧源覆盖。
- 扩展下一游戏前，先确认官方事实/区服/日期和退役 URL，再把源、镜像、页面语言与 sitemap 作为同批变更验收。
- 真正发布前仍需受控 staging、根索引及全部子图 HTTP、正文与语言契约、静态资产保留、生产回滚版本和 Actions 预算核验。单元测试或本地 XML 通过不表示已上线。
- 回退必须回退完整代码及派生物组合，不能仅回退原始源或一份公开镜像。S1 静态资源保留与无账号策略继续适用；不得恢复登录、覆盖其他 Worker 或删除保留证据。
