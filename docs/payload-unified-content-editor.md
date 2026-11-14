# 全游戏现有内容编辑契约

<!-- BEGIN R120 CURRENT -->
## 当前完成状态（2026-11-14 R120）

异环单 Worker 真实 CMS 正式更新闭环已完成。57 个材料的 171 个三语详情 URL 迁入异环，公开 JSON、搜索切片和 Main 聚合接通独立读取；一次性 NTE → Router → Main 迁移完成后，常驻 CMS 娜娜莉记录 1327 的英文简介完成草稿、审核、仅 NTE 构建、云预览和正式发布。日常内容发布仅改变 `gachia-game-nte`，最终版本 `963f4629-9b0f-4992-8373-fcb536508c81`。

精确提交 `cc0fdd18638b88d30dd42911055ae56b006b19bd` 的完整 CI [43450568989](https://github.com/aieasygames-alt/gachia/actions/runs/43450568989) 全部通过、无跳过；候选/恢复云预览、完整公网合同、三语桌面/手机六场景、无 JS 材料和最终只读控制面/模块复核通过。其余 2,879 条 CMS 记录保持。恢复已云预览，本批未实际生产回滚；本批仅证明既有角色文本资格。

当前完整来源为 `reports/nte-independent-delivery-2026-11-12-r120/independent-sources-01/source-index.json`，SHA256 `38a0a15fcc02cdc891ccf7339db49183bcb1b5f9e5c9cc45c9032df6bbf4d659`，115 份来源相对 R119 仅异环角色 raw 变化，胡桃修改及五份攻略增量保留。下一批使用 `readNteSourceIndex` 接续此索引，不回退旧来源或重放完成日志。后续顺序：蓝色星原 → 绿梦中文 → 按内容类型扩展所有游戏 → 页面内联内容 → 新增、撤回和媒体替换。详细证据见 R120 `EXECUTION.md` 和 `delivery.json`。下方旧轮次均为历史状态。
<!-- END R120 CURRENT -->

更新：2026-11-12，R119。目标是把现有内容的维护从双游戏攻略扩展到所有注册游戏；本契约不是全站正式接管声明。

R119 已完成真实生产闭环：一次性原神/Router/Main 迁移独立只读收尾并接续来源后，常驻 CMS 记录 630 审核通过的胡桃英文简介通过固定发布入口仅发布了原神 Worker。当前原神版本 `25f9c75b-4f01-4c73-90e6-b85ca93fad4b`，本次内容发布期间 Main、Router 和其他游戏均未重发。精确提交 `294c6a0` 的完整 CI `43060551863` 无跳过全部通过，候选/恢复云预览、公网页面与 JSON、平台摘要、三份搜索切片、首页聚合及中英日桌面/手机六场景验收完成；搜索验证名称、跳转和当前投影，不声称展示英文简介。

最终 [delivery.json](../reports/genshin-production-delivery-2026-11-11-r119/delivery.json)通过只读重验，115 份来源仅原神 `raw-characters.json` 发生审核内变更，五份既有攻略增量保留。下一批使用 R119 的 `independent-sources-01/source-index.json`，不可回退 R93 或重放已完成日志。执行、CI、版本与浏览器证据见 [R119 完成记录](../reports/genshin-production-delivery-2026-11-11-r119/EXECUTION.md)。这证明既有原神角色文本可完成单 Worker 正式更新，不代表所有游戏、所有字段、媒体替换或新增/删除都已开放，也不意味着单纯在 CMS 保存就等于公网发布。以下保留历史轮次当时状态。

R118 已跑通真实本机链路：隔离 Payload 编辑胡桃英文名、reviewer 发布、published 版本重读、115 来源精确冻结、仅原神 Next/OpenNext 构建，以及 136 次实际 Router/Worker HTTP。游戏页面、公开 JSON、搜索/游戏索引和固定 Main 三语言首页读到相应内容；其他游戏切片和 sitemap 不变，故障不回退旧值，切回 A 后读到 A。Main、A、B 产物树保持。新增 `pnpm --dir services/content-cms unified:genshin-smoke` 入口，需要显式提供源码提交、输出、原神 A 和固定 Main 及其 pin；默认离线安装，只有显式 `--fetch-missing` 可按锁补依赖且仍禁用安装脚本。

当前成功案例只覆盖胡桃 `/nameEn`，不是全字段正式资格，也没有修改常驻 CMS。线上尚缺一次性 Main/Router 独立读取接入，以及正式单原神传输/兼容恢复/公网验收/来源接续；本机切回 A 不代替正式兼容恢复。生产继续 R93，不能将本机回执用于云发布，更不能把验收标记作为真实资料发布。见 [R118 执行记录](../reports/genshin-cms-delivery-2026-11-11-r118/EXECUTION.md)。

R117 新增显式 `freeze-local --preview --genshin-only-local` 本机范围，默认双 owner 不变。只允许原神胡桃 `/nameEn` 单记录变化、单 raw overlay 和所有来源 O=A；有任何公开保留差异都拒绝，不能借此跳过其他游戏或 Main 的保留责任。候选/恢复校验原神 raw A/B 的产物及 HTTP 字节，自动继承精确角色文本断言，独立重开再次计算范围；本机回执不可进入正式 transport。真实源码冻结与合成产物回环 HTTP 验证通过，不是新 B 页面构建、固定 Main 联合验收或来源接续。清理约 161 MiB 早期失败副本，保留最终产物/失败日志。生产 R93、媒体开关和正式范围不变。见 [R117](../reports/genshin-single-owner-local-2026-11-11-r117/EXECUTION.md)。

R116 完成原神完整构建和 93 个旧媒体路径的产物核验；217 次本机 HTTP 通过。隔离 CMS 导出夹具通过原神公开资产让冻结 Main 读回 A/B 和恢复后的 A；没有写入实际 CMS，也没有完成 B 的页面重建、正式发布或来源接续。现行 owner 计划和发布校验仍要求 Main，生产 R93、CMS 双目标及媒体开关状态不变。见 [R116](../reports/genshin-published-media-artifact-2026-11-11-r116/EXECUTION.md)。

R115 为 93 个原神旧媒体 URL 补齐独立应用资源，并验证默认关闭的媒体开关、独立缺图/故障和 Main 恢复。Router 188 项、五种本机 Wrangler 拓扑 199 次 HTTP 和清单 r122 通过。没有新 OpenNext 构建、部署、删图或真实 CMS 编辑；生产 R93、CMS 双 owner 不变。下一步验收正式构建结构并验证原神单 owner 的编辑、发布、读回、恢复及来源接续。[R115](../reports/genshin-legacy-media-owner-2026-11-11-r115/EXECUTION.md)。

R114 在 Main 源码层退出六类原神列表的旧渲染与 29 个旧表项，保留共用默认值和公开 URL。Web 567、文档/范围 38、类型与覆盖 16 scope 的 inventory r121 通过；其他游戏及 sitemap 的 538 项观测不变。79 张仍被原神角色数据引用的图片和独立站引用的 OG 仅在 Main 有本地副本，未删图。下一步验证旧媒体 URL 的独立归属、兼容和恢复，再验证单原神 CMS owner 发布及来源接续。本轮无新构建或新产物 HTTP，生产 R93、CMS 双 owner 和正式编辑范围保持。见 [R114](../reports/genshin-main-retired-copy-2026-11-11-r114/EXECUTION.md)。

R113 的 Main 完整构建已退出原神攻略服务端追踪副本，138 份 NFT 无目标数据路径，1,153 个公开数据/索引/图片文件与 R112 兼容产物一致。候选拒绝服务端副本，资产工具 31 项、inventory r120 检查通过。磁盘清理后复用原构建封装兼容/独立候选，四种真实 HTTP 拓扑共 40 项通过。保留默认兼容资产、生产 R93、CMS 双 owner 及正式字段范围，无真实编辑或云部署。见 [R113](../reports/genshin-main-server-data-2026-11-11-r113/EXECUTION.md)。以下保留各轮当时状态。

R112 解除市场情报页原神攻略的实际 Main 镜像消费：请求期使用独立 Worker 既有出口，默认显式 ASSETS 兼容保持，启用 owner 后缺绑定/损坏/超时不回退旧镜像。三语言动态页面 no-store/noindex，失败明确提示检查未完成且保留其他游戏发现；当前实际 31 篇攻略、0 条原神专用规则，不编造新鲜度覆盖。Main 完整构建、103 项真实 HTTP、19 项浏览器场景、Web 560、Router 154、Data 168、CMS 聚焦 39、文档/范围 38 与相关检查通过，538 项其他游戏/sitemap 摘要保持；未重跑完整 CMS、发布工具或四站消费者套件。新清单 r120、原神冻结产物未改，B 仅本地 fixture，见 [R112](../reports/genshin-freshness-owner-2026-11-10-r112/EXECUTION.md)。

实际 NFT 仍追踪一份未被原神分支读取的 `raw-guides.json` 进入服务器产物，图片也仍保留，不是 Main 全部原神字节退出。下一步处理剩余默认值/内联事实、默认无原神资产及服务器副本构建合同，再资格化单 owner、候选/恢复/来源接续。生产 R93、CMS 双 owner、正式字段/实体生命周期资格不变，无提交/安装/真实编辑/云写入，来源认证不列前置。约 8.8 GiB 可用，保持 8 GiB 保留线，仅提醒约 846 MiB 可重建应用输出，不删除历史证据。以下保留各轮当时状态。

R111 退出 Main 的原神首页、版本、下载和祈愿四类入口及 11 个重复事实/推荐表项，直接 Main no-store/noindex 404，公开 URL 继续由未修改的 R110 原神产物提供。共享配队和玩家 API 留 Main，其他表项按前置快照逐字节保持，不把旧版本事实复制到独立站。Main 完整构建、五种实际 Router/Worker 拓扑 240 项 HTTP、Web 528、Router 154、Data 168、四站消费者 123 和相关类型/清单检查通过，其他游戏/sitemap 538 项摘要保持。CMS 最终串行全量 499/500，剩余封装测试及首次聚焦复跑被真实磁盘预算拒绝；空间回升后第二次聚焦复跑 1/1 通过，不视为一次全量通过。最终清单 r119，失败、范围和一次性可复验回执见 [R111](../reports/genshin-main-hubs-2026-11-10-r111/EXECUTION.md)。

递归字面量运行时图的 402 文件/1,148 边无原神源码边，138 个实际 Next NFT 无原神路径，但市场情报页仍动态读 Main 原神攻略镜像，尚未语义独立。下一步先解除该实际镜像消费，再处理剩余共用默认值/内联事实、默认无原神资产构建与单原神 CMS owner 的候选/恢复/来源接续。现有 Router 未配 token 时，即使 full-cutover=false，页面仍允许进独立站；本轮只分拓扑验证，没有改变生产路由策略。生产 R93、CMS 双 owner 和正式资格不变，无提交/安装/真实编辑/云写入，来源认证不是前置。以下保留历史轮次当时状态。

R110 将交互地图消费迁入原神独立站，三子图支持分类/搜索、缩放/拖动/居中、列表分页/点位定位及本机收集记录。Leaflet 1.9.4/markercluster 1.5.3 使用已安装包的原样浏览器分发并保留许可，没有包管理器安装或锁变更。旧进度键不写入或删除，按子地图增加独立 v2 覆盖记录；损坏/配额/访问失败提示且可保留页面内操作，不写账户/玩家 API。Main 重复地图 UI/资料导入退出，同类直接 AST 运行时导入为 0，非完整传递或语义依赖清零。两站完整构建、64 项真实 HTTP、18 组三语桌面/手机交互、10 个异常注入、无 JS 和 18 组完整图像视觉检查通过，最终清单 r118，回执/失败保留与完整验证见 [R110](../reports/genshin-map-owner-2026-11-10-r110/EXECUTION.md)。

第三方实时地图仍不是 CMS 管理的 raw，不因交互迁移获得正式点位编辑权。当前生产仍 R93、CMS 双 owner、正式字段及实体生命周期范围不变；下一阶段是剩余内联事实/传递依赖和单原神发布/恢复/来源资格，不将消费者迁移冒充所有内容均可正式更新。以下保留历史轮次当时状态。

R109 将公开地图 API 的运行归属接入原神独立 Worker，范围仅 `/api/map`、`/api/map/points`、`/api/map/tile` 的 GET/HEAD。单独默认关闭的 Router 地图开关要求原神完整启用及绑定，故障或配置不一致 no-store 503、不回退 Main；进度、账户、收藏仍属平台。真实 22.5 MB 点位源改为有界流式解析和身份/坐标投影，固定代理兼容真实 `.jpeg` 瓦片并核验签名，不写 R2，不转发凭据；有许可的原样 vendored 解析器不改变锁或触发安装。保存源六组投影逐点一致，实际原神 OpenNext/冻结 R108 Main/实际 Router 四种拓扑 78 项 HTTP、CMS 500、Web 520、Router 154、Data 168、四站消费者 101 与相关检查通过，见 [R109](../reports/genshin-map-api-owner-2026-11-10-r109/EXECUTION.md)。最终清单 r114，所有历史保持。

这不是第三方实时点位的 CMS 编辑权或全地图迁移完成声明。Main 旧公开 handler 仍保留兼容，独立地图页仍为静态参考；交互地图和两个 Main 文件/3 条直接导入尚待退出，下一阶段先完成交互与本地进度兼容，再资格化单 owner 发布/恢复/来源。生产 R93、CMS 双 owner、正式字段及实体生命周期范围不变，无提交/安装/真实编辑/云写入，来源认证不列前置。以下保留历史轮次当时状态。

R108 最终浏览器 7 场景、31,518 项断言通过；同一冻结产物的本地角色跳转最高约 9 秒，有界 30 秒成功，不构成性能资格。部分既有远程头像 ORB 失败保留为媒体缺口，只有代表头像加载得到验证，不宣称全媒体可用。

R108 将 Main 榜单交互迁入原神独立站：114 可见角色三语名称/ID 搜索、元素/武器/稀有度筛选、清除筛选及当前结果的等级分布接通，无 JS 直接展示完整结果。修复武器枚举大小写筛选、独立站漏掉 5 个 C 级角色的问题；`none` 元素保留并可筛选，未知评级原文显示，缺失评级明确未评级，不补为 B；零分布不画虚假宽度。只投影现有角色身份/评级，不改评级、不切换到另一份示例榜单；旧日期仅描述旧页面标注，不宣称当前资料新鲜。Main 重复组件/动态入口和相关原神内联介绍退出，直接 Main 榜单/子路径 no-store/noindex 404，其他游戏及玩家/API 保持。两站完整构建、CMS 500、Web 520、四站消费者 44、162 筛选交集的三语 486 视图、342 三语角色视图/2,052 断言、实际 Router HTTP 174 与其他游戏/sitemap 538 项摘要通过；最终浏览器/可复验回执见 [R108](../reports/genshin-tier-owner-2026-11-10-r108/EXECUTION.md)。最终清单 r111、中间 r110 和历史保持，同类直接运行时依赖剩余 2 文件/3 条，下一阶段为地图/API 公开数据与玩家进度边界及剩余内联事实。生产 R93、CMS 双 owner、正式字段/实体生命周期范围未变，无提交/安装/真实编辑/云写入。消费者已展示某字段不等于正式发布器已开放该字段。以下保留各轮当时状态。

R107 将 Main 四位置配队交互迁入原神独立站，114 角色的三语搜索/元素筛选、重复禁选、推荐排序、六组快速填入、整队使用及移除/清空/键盘焦点接通。只消费现有角色身份和配队字段，不维护新配队副本；推荐去重不再修改源成员顺序，未知成员保留原文且对应位置留空，重复成员不重复入队。共鸣名称及组合预览移归独立站，未满四人明确标记；旧组件数值说明未核对，不搬入或声称已 CMS 资格化。账户功能仍关闭，玩家记录/API 不迁移。Main 重复组件/分支和无用内联共鸣副本退出，直接 Main no-store/noindex 404，公开 URL/其他游戏保持。完整两站构建、342 三语配队视图/315 组推荐/1,242 项资料断言、Web 517、原神消费者 31、实际 Router HTTP 164 和其他游戏/sitemap 538 项摘要通过；最终验证/浏览器/回执见 [R107](../reports/genshin-teams-owner-2026-11-10-r107/EXECUTION.md)。inventory 新增 r109，同类直接依赖剩余 3 文件/4 条，下一优先级榜单。生产 R93、CMS 双 owner、正式字段/实体生命周期资格未变，无提交/安装/真实编辑/云写入；不能将消费者迁移当作所有内容已可正式更新。以下保留各轮当时状态。

R106 将 Main 双角色对比迁入原神独立站，替换原静态名册。114 个角色的三语言名称/ID 搜索、元素筛选、不同角色选择、更换/取消/移除/清空、键盘焦点及无 JS 资料入口接通；只投影需要的角色字段、三类主动技能和既有装备目录，未新增可编辑副本。评级、技能/冷却/能量、推荐配装/主副属性、前三组配队与基础信息使用原始资料，未解析名称和缺失内容明确保留，原有缺译不伪造译文。武器类型枚举兼容首字母大写；不读写个人记录或调用账号 API。Main 的重复对比组件/动态分支退出，直接 Main 及子路径 no-store/noindex 404，公开 URL 和其他游戏行为保持。全角色三语言结果 342 视图/8,292 项断言、Web 514、CMS 500、Router 97、Data 168、四站消费者 29 和其他游戏/sitemap 538 项摘要保持；实际构建、Router、浏览器和回执见 [R106](../reports/genshin-compare-owner-2026-11-10-r106/EXECUTION.md)。最终 inventory r108、中间 r107 与旧清单/产物均保留。同类直接运行时依赖剩余 5 文件/6 条，下一优先级配队，然后榜单/内联事实/地图/API 和单 owner 资格。生产 R93、CMS 双 owner 与正式字段/实体生命周期范围未变；无提交/安装/真实编辑/云写入，不把消费者迁移当作全部内容已可正式发布。

R105 将单角色材料、多角色规划与旧简化伤害公式迁入原神独立站，并保留原有刷取清单。只投影计算器需要的角色字段、既有需求和材料目录，不维护新事实源；修复天赋 `1→2` 被错误解析成 `12` 的漏算。90 份需求覆盖可见角色中的 86 个，28 个缺资料角色明确提示；未收录材料 ID 不隐藏，单天赋和未收录成本边界明确。库存沿用旧键、挂载后校验、两模式共享，存储失败可见，损坏记录不自动覆盖，无 JavaScript 保留全角色资料链接。Main 重复组件/分支退出，直接 Main 计算器及子路径 no-store/noindex 404；其他游戏行为保持。8,190 个需求区间、342 三语言结果视图/3,870 数量断言、完整两站构建、144 项实际 Router HTTP、CMS 500、Web 511、原神消费者 17 及其他游戏/sitemap 538 项摘要保持，浏览器与完整回执见 [R105](../reports/genshin-calculator-owner-2026-11-10-r105/EXECUTION.md)。清单新增 r106，旧证据/产物与 raw 保持，直接依赖剩余 7 文件/10 条；下一优先级对比，再配队/榜单和地图/API、内联事实。生产 R93、CMS 双 owner、正式字段/实体生命周期资格均未变，本轮没有提交/安装/真实内容或云写入，不将计算器消费迁移当作全内容正式接管。

R104 完成原神配装交互消费迁移：全 114 角色的搜索、元素/稀有度筛选、切换、既有推荐武器/套装效果/属性/配队、通用武器五项排序、旧 hash 分享/浏览历史、复制失败及空资料状态均归独立站。客户端只接收所需角色字段，不维护另一个内容源；无 JavaScript 时链接至角色资料。Main 重复配装组件/分支退出，直接 Main 配装 no-store/noindex 404，其他工具保留。三语言全角色配装 342 视图/4,953 项断言、两站完整构建、134 项真实 Router HTTP、9 项浏览器场景和两项正常视口遮挡检查通过；其他游戏/sitemap 538 项摘要保持。最终完整 CMS 500、Web 508、Router 97、Data 168、四站消费者 17、资产工具 27、文档/范围 38 和相关检查通过，见 [R104](../reports/genshin-build-owner-2026-11-10-r104/EXECUTION.md)。最终清单新增 `2026-11-10-r105`，中间 r104 保留，不覆盖历史。直接运行时依赖剩余 9 文件/14 条，非完整依赖图；下一步计算器，再对比/配队/榜单和地图/API、内联事实。配装页面能消费某字段不等于正式发布器已开放该字段，CMS 双 owner、R93 生产和正式资格未变，无常驻安装、真实内容或云写入。

R103 将 Main 重复角色详情中的既有档案、推荐配装/配队、养成材料、来源 FAQ 与相关角色接入原神独立站，直接读取现有数据模块而非新增可编辑副本；删除 Main 重复组件/分支，公开角色 URL 和原独立页面内容保持，直接 Main 仍 404。114 个可见角色的三语言服务端页面共 342 页通过 41,105 项资料断言，覆盖字段变化、未解析名称、空可选项、未知 ID 及 FAQ JSON-LD 转义。两站完整 Next/OpenNext 构建、124 项真实 Router HTTP、7 项桌面/手机/无 JavaScript 浏览器观察通过，其他游戏/sitemap 538 项摘要保持；完整 CMS 500、Web 505、Router 97、Data 168 与相关检查通过。见 [R103](../reports/genshin-character-owner-2026-11-10-r103/EXECUTION.md)。新清单 `2026-11-10-r103` 不覆盖历史；当前已删除的跟踪文件退出清单，漂移仍拒绝。Main 直接依赖剩余 11 文件/18 条，非完整依赖图；高级工具仍缺交互对等，地图/API、内联事实、CMS 单 owner 与候选/恢复/来源资格尚未完成。正式字段/发布资格不因页面展示增加而自动扩展，生产 R93 和双 owner 不变，无常驻安装、真实内容或云写入。下一阶段先配装工具真实交互迁移，再逐项解除其他依赖。

R102 解除 Main 六类通用数据 loader、攻略正文入口及 sitemap 的原神实际导入，通用角色摘要转为请求期读游戏；开发/生产 static params 不再从旧原神角色清单生成，Main layout 不枚举原神。Main 六类目录/详情无缓存、noindex 404，Router 下独立站三语言目录和代表性详情正常；共享配队、地图和账号/进度 API 不一起退役。538 项其他游戏/完整 sitemap 摘要前后相同，完整 Main OpenNext 与字节不变的 R101 游戏产物通过 124 项真实 HTTP，完整 CMS 500、Web 503、Router 97、Data 168 和相关门禁通过，见 [R102](../reports/genshin-main-data-boundary-2026-11-10-r102/EXECUTION.md)。清单使用新增的 `2026-11-10-r102`，旧日期版本保留，生成器拒绝覆盖旧目录。Main 高级工具、专属角色详情、地图/API 和内联事实仍有依赖，默认兼容 raw/索引资产、CMS 双 owner、生产/staging 配置和 R93 来源保持。新 Main 的这些目录不再提供兜底，部署前必须联合资格化独立站路由及恢复，不能关闭游戏路由开关当作回滚；本轮没有正式发布资格扩大、安装或真实内容/云写入。

R101 已用完整 Main/原神 OpenNext 构建和实际 Router 完成隔离本地 Service Binding 验收，56 项 HTTP 检查通过。Main 独立资产候选不含原神 8 份公开 raw 镜像、平台摘要/榜单及四份基础索引里的原神切片；三语言首页和旧 URL 从游戏出口正常取数，独立站故障不回退旧内容。兼容 Main、候选 Main、原神产物和逐响应证据均冻结保存；默认构建和生产配置未切换。资产工具 27 项、CMS 聚焦 21 项、发布工具 1,939 JS/56 Python、文档/范围 38 项及相关检查通过，见 [R101](../reports/genshin-migration-runtime-2026-11-10-r101/EXECUTION.md)。Main 实际正文导入、重复页面、sitemap/API 和 CMS 双 owner 仍未解除，这不是单原神正式发布或真实 CMS 审核内容构建证明。下一步优先移除实际运行依赖并验证功能对等，再接单站来源/恢复资格；当前生产继续 R93。以下各轮保留其当时验证边界。

R100 新增独立站轻量 `platform.json`，由现有 CMS raw 角色/攻略/兑换码数据派生。Main 首页与共享配队改为请求期消费，移除相应原神手工名称/动态摘要和完整角色导入，首页不再加一小时公共缓存。默认 Main `ASSETS` 兼容快照与独立出口共用生成器；候选模式要求直连原神的 `GENSHIN_CONTENT` Service Binding 和精确 `GENSHIN_CONTENT_ENABLED=true`，不经过公网或 Router，不在失败时回退旧数据。新摘要兼容 URL 也接入 Router。真实 workerd 证明消费者 bundle 不变时 A/B 名称、图片和攻略摘要随独立站更新，其他游戏保持；这不是完整 Main OpenNext HTTP 或真实 CMS 单站发布证明。隔离基础索引可以完全去掉原神切片，但默认产物、正文/raw 镜像和 CMS 双 owner 仍保留。生产/staging 未新增绑定或启用开关，当前来源仍为 R93。见 [R100](../reports/genshin-platform-content-2026-11-10-r100/EXECUTION.md)。

R99 按用户批准的独立内容归属方案先建设原神数据出口：当前冻结源码的 9 份 raw JSON、三语言搜索、角色清单和榜单随独立 Worker 资源准备生成，共 15 个文件，内容版本绑定来源及派生数据。Router 新的默认关闭开关兼容旧 JSON URL，聚合索引只替换原神切片；失败不使用 Main 旧原神副本。实际 Next/OpenNext 构建、15 个真实 loopback 数据响应和既有角色页通过；这不等于真实 CMS 单站发布或生产路由已切换。Main 页面/镜像、CMS 双 owner 计算和 R93 来源保持。下一批解除 Main 共享摘要/SSR 与正文导入依赖，再资格化单站发布；既有双站能力只作为兼容，不把它继续扩成全部游戏的长期目标。范围与证据见[迁移计划](../plans/genshin-worker-content-migration-2026-11-10.md)和 [R99](../reports/genshin-worker-content-2026-11-10-r99/EXECUTION.md)。以下 R98 及更早保留当时状态。

R98 已补固定原神→Main 的双站来源协议：只读投影先实际重开 R97 完成证据和全部五个旧来源模块，再从已接受的两个候选提取 UUID、模块/部署身份，并要求候选产物 SHA 与上传接受值相同。双站来源索引/下一批交接使用显式 schemaVersion 2，绑定两站顺序、部署 ID 及各自公网观察；两站同时换入精确封存模块，另外三站、静态并集、90 份公开 JSON 和全部 115 来源保持。下一批无论选择 Main、原神→Main 或异环→Main，都从新 A 与完整五站证明派生，不回退至旧原神/Main。每次新观察前后复验五个不可变版本及受保护拓扑，旧观察不能复用为新目录；历史重读不续期。旧 Main v1 回执/正式入口保持。当前只完成协议与合成 HTTP/产物的联合回归，不是固定 CMS 历史根、真实 CI/安装/审核或生产来源推进；正式资格仍不变。下一步接固定双站历史根和祖先 CI、停止对账/显式恢复与生产入口，再走精确 CI/安装/实际发布。见 [R98](../reports/payload-genshin-main-source-2026-11-09-r98/EXECUTION.md)。

R97 新增固定 `genshin → main` 单次部署适配器及独立完成态 reader，重开四个上传时不可变模块、四组精确预览、两站写入授权、两次部署创建/精确 ID 复查和两组公网证据。完成态只接受两站正常成功日志，partial、停止或未知结果不能包装成完成；历史重读不续期。CMS 本地绑定从冻结 A/B 和封存 transport 推导单角色文字验收、实际 Router 公网投影及运行配置，额外核对 Main 原神角色 JSON 镜像与各方向源码同 SHA。旧 Main 部署入口/回执和正式资格保持，不新增 CLI，不修改 R93 来源。云 HTTP 和完成链测试使用合成响应，外部 CI 参数只做身份绑定，当前没有固定双站正式入口重验 CI/安装/审核；双站历史根、停止态对账/显式人工恢复与来源替换仍待接通。见 [R97](../reports/payload-genshin-main-evidence-2026-11-09-r97/EXECUTION.md)。

R96 已把生产校验器的一次性授权改为逐 owner 的顺序授权状态，并接入现有 Main 推广入口。协议确认精确部署和受保护拓扑、持久记录 `promoted` 后，才确认本 owner；下一 owner 必须重新执行当前 CMS、源码/产物、五个不可变来源及祖先 CI 检查。确认不延长来源或预览的 15 分钟时效，结果未知、partial 或后续检查失败仍停止，不自动回滚/重试。原神→Main 的固定校验器/顺序协议已有隔离组合；安装/CMS 资格和推广 HTTP 仍为合成边界，不是正式双 owner 发布资格。Main 回执格式和历史读取保持原语义，正式范围仍为 11 个 Main 游戏/237 篇既有中文攻略。下一步是双 owner 的固定预览/部署/公网适配器、独立历史完成读取和双 owner 来源接续，再完成精确 CI、安装与真实交付。见 [R96](../reports/payload-ordered-promotion-2026-11-09-r96/EXECUTION.md)。

R95 已把四站角色文本的公开 A 恢复检查接入本地发布准备，新的 schemaVersion 2 发布回执绑定候选/恢复配对合同，独立重读时重新推导，拒绝缺少文字检查或回执降级。原神单角色两方向额外生成与实际 Router 一致的公网投影，绑定独立 sitemap、带游戏前缀的静态资源和 HTML 缓存策略；合成 loopback/真实 Wrangler dry-run 与实际 Router 组合均有回归。这是本地发布链实现，不是已完成真实 Worker 或公网验收，正式资格仍保持原 Main 攻略范围。见 [R95](../reports/payload-character-publication-pair-2026-11-09-r95/EXECUTION.md)。

R94 补入四个独立站的既有角色文本合同：原神 114、异环 42、蓝色星原 19、绿梦 13 个角色，共 5,803 个文本叶子。公开 A→候选 B 的实际字段和语言消费者在本地构建前自动推导，schemaVersion 2 构建回执重读时再次核对，不能省略或替换为无关页面。原神/异环包含已显示的技能文本；蓝色星原仅现有名称表；绿梦仅中文。数值、枚举、关联、媒体、新增/撤回及未显示字段不在合同内。当前是源码/本地消费验收阶段，不是常驻安装或正式发布范围扩展；精确执行状态见 [R94](../reports/payload-dedicated-character-text-2026-11-09-r94/EXECUTION.md)。

R93 已完成 HI3 既有攻略的首次正式更新、公网验收及完整来源接续。修复早期 Ananta 公网白名单与多游戏资格不一致的问题后，当前提交 `98bacec` 的完整 CI `42580090621`、CMS 439 项、发布工具 1,608 项 JavaScript/56 项 Python、Web 452 项及类型/文档门禁全部通过。完整真实只读写前测量在来源年龄 784.040 秒通过；正式执行重新取得基线，在 777.889 秒写入一次，未复用测量授权。Main 已切换至 `a389b6f2-aea9-4fdd-94e6-1ecf331913d7`，1,318 项公网验收及部署后复验通过，五 owner/115 来源索引已接续，未重传版本、自动重试或回滚。其他 2,879 条 CMS 记录保持不变。回执、失败诊断与独立复验见 [R93](../reports/payload-main-public-guides-2026-11-09-r93/EXECUTION.md)。

公网 reader 与 CMS/页面消费共用原有 11 游戏名单，固定适配器显式传入已复验的 qualification；旧试点保留原中英文必需覆盖，新攻略策略要求当前游戏中文详情、对应公开 JSON、已发布 Ananta 中文内容及原全局保护项，不开放请求/CLI 跳过选项。仍仅接受既有中文 `/content` 单条变更，不扩展 Sea、独立站、其他语言/类型或实体生命周期。11 游戏/237 篇是当前限定资格，不是所有游戏所有内容均已正式开放。

R93 最终独立复验已重开实际发布及完整来源索引、全部祖先 CI 和 1,318 项封存公网响应；当前公网 HI3 JSON/中文攻略与候选合同一致，受保护拓扑及原推广日志保持。最终证明为 `delivery/independent-homebrew/verification.json`，SHA256 `c8e452239a8cbec57dc4542404b2cd0f40e336fbcbbf06470056510fc359db20`。下一批使用 R93 的 `delivery/published.json` 和 `delivery/sources/source-index.json` 显式取得新基线，不再以 R73 作为当前来源，也不重放已完成的 HI3 推广。

R92 最终完整回归及 `ae0f397` 的精确 CI `42573869451` 全部通过。新执行器的实际基线、推广打开和双版本续验均通过；两原版本各 1,318 响应，最终审核/来源/模块/拓扑复查通过。随后公网投影在来源年龄 621.365 秒时因上述旧白名单停止，并非来源过期；未进入最后两轮协议复验、未授权或创建推广日志，没有部署或来源接续。完整写前窗口仍未完成资格验证，不能据局部耗时执行推广。

R92 首次完整写前只读测量通过 1,267 响应的新基线，但在重开推广证据时遇到 Python 子进程 30 秒超时，尚未续验、授权或创建推广日志。离线诊断重开全部 115 来源、五 owner 和双预览通过，未复现该超时；94 次解析共 2.877 秒。历史递归读取现复用已有、每次完整检查文件身份的受保护产物清单会话，失败污染整段会话，不缓存审核、CI、云或 HTTP 成功结果；解析失败增加版本、页数、输入大小和原错误上下文，不延长超时或重试。同一真实历史读取由 113.580 秒降到 83.559 秒，约减少 26%；65 项聚焦回归、类型及 diff 检查通过。完整回归、精确 CI 和新实现的完整写前实测仍待完成，不能据此部署或扩大正式资格。见 [R92](../reports/payload-prewrite-qualification-2026-11-09-r92/EXECUTION.md)。

R91 已接通推广的写前授权生命周期：写前仍要求新鲜完整来源及双版本预览，最终异步拓扑读取后再次检查时钟；固定执行器只捕获一次授权，不接受用户跳过时效参数。部署后的两次复验以该授权时刻重开历史来源，同时继续核对当前 CMS、五个实时不可变模块、祖先 CI、执行器、版本及拓扑。新日志和回执绑定 `write-boundary-v1` 及逐 owner 授权，历史重开和来源接续按写入时刻验时效，旧回执维持原语义。本地 CMS 439 项（含 148 项固定入口子用例）、完整发布工具 1,595 项 JavaScript/56 项 Python、38 项文档/范围测试及类型检查通过；提交 `2dba812` 的精确 CI `42568051118` 全部通过。新 reader 对 R89 真实证据的 115 来源、5 owner、双版本预览及祖先 CI 独立复验通过，原证明不变。尚未执行部署、预览续验或来源接续；下一步验证完整写前路径实际耗时后，再推进现有 HI3 版本首次推广。见 [R91](../reports/payload-promotion-lifecycle-2026-11-09-r91/EXECUTION.md)。

R90 已为 Main 推广请求增加可选、显式 pin 的新鲜 `sourceHandoff`，只允许重新观察相同 publication/source index，要求完整公开 A、上一版产物、计划及 release key 不变；原 production/audit/preview 继续作为封存身份，不改旧时间戳。新证明绑定续验、全部推广日志和完成回执，历史读取与停止态只读收尾重开完整来源及祖先 CI。完整本地 CMS 439 项、固定入口子套件 134 项、完整发布工具 1,576 项 JavaScript/56 项 Python 测试与类型检查通过。首次 CI 的单子进程超时已通过完整两分片修正，最终 `9edd620` 的精确 CI `42561892296` 全部通过。真实新基线 1,267 响应通过、完整 A 不变；真实只读推广审计 267.266 秒通过，随后独立重开新证明、115 来源、5 owner 及相关 CI 全部通过。旧证据不变，没有上传、部署、预览续验或来源推进。审计结束时来源年龄已达 379.269 秒，完整推广尚未证明能在原窗口内完成；下一步补齐写前授权与部署后只读完整性复验的时效阶段，再推进首次 HI3 推广、公网验收和来源接续。详见 [R90](../reports/payload-promotion-source-2026-11-09-r90/EXECUTION.md)。

R89 已完成真实只读续接及独立验收。累计修复提交为 `0afcaf2`，完整精确 CI `42552605655` 全部通过；新鲜公开基线 1,267 项通过，原恢复/候选各 1,318 项 HTTP 及最终状态复核通过，生成完整预览回执。独立读取重新验证两段停止祖先、模块、响应和 CI 链，旧日志未改，未上传、切流或推进来源。下一步处理推广入口的新鲜来源输入：当前历史 production 内的交接已过期，不能改签或重跑完成流程来续期。见 [R89](../reports/payload-live-continuation-2026-11-09-r89/EXECUTION.md)。

R88 已接入 R86 停止态的受限只读续接。固定请求可显式提供 `completionStop` 的日志及两份 HTTP pin；严格重读原上传与首次收尾两段证据，仅接受完整双版本 HTTP、恢复已接受且候选未接受的 Python 超时停止。新尝试使用固定 `-continued` 独占目录和日志，两方向重新观察，完成回执及历史读取绑定两段祖先；失败不可重试，不允许递归续接。协议 146 项、请求/绑定 41 项及新增固定入口后续链组合通过；真实 R83/R86 共 5,272 项响应语义和模块复验通过。尚未取得新执行器精确远程 CI或执行实际续接，不表示已公开发布。见 [R88](../reports/payload-completion-continuation-2026-11-09-r88/EXECUTION.md)。

R88 最终本地验证：完整 CMS 427 项（含独立执行的固定入口子套件 128 项）、统一发布工具 434 项、文档/范围门禁 38 项全部通过，类型及 diff 检查通过。此结果不替代精确远程 CI 或真实云端收尾。

R87 已将 HTML 指纹调用改为最多 32 页、4 MiB 序列化输入的分块处理，单个合法大页面独立处理；解析器字节、指纹语义、30 秒单进程限制及交接时效不变，失败不重试或返回部分成功。协议 129 项、CMS 入口 23 项和类型检查通过；真实 R79 本地预览合同的三站双方向共 4,452 项响应重新验过，耗时 15.794 秒，旧 pin 不变。新代码尚未取得精确远程 CI，R86 停止态未续接，不代表云端收尾或发布完成。下一步为绑定 R83 与 R86 双日志的独立只读续接，见 [R87](../reports/payload-bounded-fingerprints-2026-11-09-r87/EXECUTION.md)。

R86 的只读收尾及历史接续代码已通过精确提交 `c2335b1` 的完整 CI `42463626787`。真实单次执行取得新鲜公开基线，原恢复和候选各 1,318 项 HTTP 通过；恢复已接受，但候选采样后的本地合同复核因 HTML 指纹 Python 子进程超过固定 30 秒限制而停止。没有整批完成回执、公开切流或来源接续；原上传日志与本次停止证据均保留，不允许重跑。独立诊断重读了全部 2,636 响应的长度/摘要，不冒充语义复验或发布授权。下一步处理批量指纹解析的有界执行，再为该停止状态提供独立只读续接，见 [R86](../reports/payload-reconciled-publication-2026-11-08-r86/EXECUTION.md)。

## 当前覆盖与批量验收

`pnpm unified:coverage [--output <新目录>]` 从当前固定 inventory、统一计划、路由归属和公开镜像台账生成只读 JSON/Markdown 矩阵，不启动数据库、不访问云端。按游戏、来源文件、内容类型分别列出编辑单元、可编辑叶子、空结构/仅受保护记录、委托通道、目标 owner、公开镜像及统一发布器的有限资格。矩阵使用与编辑校验相同的字段保护规则；公开镜像不等于页面已消费，未读取的常驻 CMS 状态明确标记为未观察。

R74 实测为 16 scope、115 来源、161 行类型覆盖、2,795 编辑单元，其中 2,775 个有可修改叶子，20 个为空结构或仅含受保护字段；6 个来源仍委托给现有攻略通道或摘要生成器。当时统一正式发布资格只有 Ananta 单条中文正文；原神/异环已运行攻略发布器不计入这一数字。

R77 源码资格扩展到 11 个 Main 游戏的 237 篇既有中文攻略正文，每次仍限一篇、仅 `/content`。实际页面和 Markdown 服务端渲染逐篇验证，其他字段及翻译相对公开 A 不变；Sea 派生详情链路、四独立站和其他内容类型不在此次资格内。历史 Ananta 回执策略保持不变。本轮未安装新发布器、未编辑常驻库或部署网站，不能将源码资格写成 237 篇已上线。见 [R77](../reports/payload-main-guides-2026-11-07-r77/README.md)。

R78 已将该扩展安装到常驻应用，精确提交 `cedcaf8` 的完整 CI `42368572044` 全部通过且无跳过。真实数据库副本中，11 个游戏分别通过构建后的 HTTP 草稿/审核/正式读取、候选导出和资格检查；旧封存历史 115 来源重开验证通过。实际切换前后冷备隔离恢复成功，2,880 条内容、全部版本、审核状态及媒体摘要不变，9 项本机 HTTP 防护通过。没有编辑真实内容、没有云上传或网站部署；非 Ananta 新范围的真实公网发布验收仍待完成。见 [R78 完成记录](../reports/payload-main-guide-install-2026-11-07-r78/EXECUTION.md)。

R79 已真实审核崩坏3记录 `1183` 的中文正文标点修正，其他 2,879 条内容及目标记录其他字段/译文不变。完整来源接续基线、正式导出/冻结、三个保留目标的真实构建（446 响应）、候选/兼容恢复与模块封存和本地预览（每阶段 4,452 响应）均通过，独立复验和审核后备份恢复成功。没有云上传或公网切换；下一步复用本轮候选执行新鲜生产预检、云预览和正式推广，不重新编辑或重建。见 [R79](../reports/payload-hi3-publication-2026-11-07-r79/EXECUTION.md)。

R80 已通过该 HI3 候选的真实本地及云端生产预检，完整 A 不变，精确完整 CI 通过，Main-only 范围闭合，原神和异环保持当前云版本。没有启动上传：公开观察 372 秒、预检 335 秒，预检完成时交接有效期只余 154 秒，不足再执行上传入口的完整复验。下一步优先解决重复封存历史验证耗时，再取新基线继续同一候选；不放宽时效或完整性检查。见 [R80](../reports/payload-hi3-cloud-2026-11-07-r80/EXECUTION.md)。

R81 以真实性能采样定位重复产物读取，复用既有同步验证 pass 优化静态并集、发布产物与保留目录祖先检查；不跨异步/写入边界缓存，不放宽完整性或时效。同一真实历史回执离线重读从 77.993 秒降至 55.634 秒，单次本机测量约减少 29%，不能代替全链路时效验收。源码尚未形成新精确 CI，也未安装或部署。见 [R81](../reports/payload-verification-cost-2026-11-07-r81/EXECUTION.md)。

R82 已将优化提交为 `21e1c26`，精确完整 CI `42439942811` 全部通过；新执行器真实本地及云端预检通过，原 HI3 候选和完整 A 不变，Main-only 保留范围闭合。云端预检实测从约 335 秒降至 263 秒，但完成时只余约 266 秒，不能再完成上传入口的重复预检及云预览，因此未上传。下一步处理上传链中的整链重复验证，不再只重跑相同只读预检；保持写前实时检查和时效约束。见 [R82](../reports/payload-hi3-preflight-2026-11-08-r82/EXECUTION.md)。

R83 已将会话内受保护产物清单复用、只读并发采样和普通成功收据接续提交为 `0f6cb02` / `bf970a1`，最终精确完整 CI `42445583566` 通过。真实只读格式比较发现旧解析器与线上流式元数据不一致，新固定上传显式使用并绑定现有 `streaming-v2`，旧收据仍保持兼容。新鲜基线观察约 101 秒，完整 A 不变；首次上传了 HI3 的恢复与候选两个精确云版本，各 1,318 项 HTTP 均通过。但候选验收后的最终来源复查遇到交接过期，协议停止，没有完整成功收据或公众切流。独立只读复验重开两份模块和全部 2,636 项响应，前后拓扑一致；诊断回执不是推广授权。下一步只读补齐这两个已知版本的收尾，保留原停止日志，不重传、不重建、不延长旧时间戳。见 [R83](../reports/payload-upload-verification-2026-11-08-r83/EXECUTION.md)。

R75 已用现有安装版受控导入器将全部 16 scope 的 2,795 统一单元导入常驻 PostgreSQL；该轮新增 2,730 个 held 草稿，总内容为 2,880 条，原有 85 条攻略另行保留。旧记录/版本/媒体不变，重复导入完整数据摘要不变，前后冷备隔离恢复及本机 HTTP 防护通过。见 [常驻执行报告](../reports/payload-all-game-resident-2026-11-07-r75/README.md)。

R76 随后已安装包含字符串审核修复的精确提交 `ac95a1e`：完整 CI、独立构建、数据库副本的完整行保留与 6 类字符串认证 HTTP 编辑/审核验证通过；冷备切换后真实库和版本摘要不变，常驻健康及升级后隔离恢复通过。没有自动审核导入内容或改变网站。这是常驻编辑/审核升级，不是全类型正式发布资格。见 [升级完成记录](../reports/payload-resident-upgrade-2026-11-07-r76/EXECUTION.md)。

真实 Payload 隔离回归现对每个有可编辑叶子的来源/类型至少选一条，共 139 行，覆盖全部 16 scope，执行 editor 草稿、reviewer 审核、正式版本重读和同批导出，并逐项重读 JSON/TypeScript 候选值。该回归发现并修复了字符串区块被 Payload 默认 JSON 校验器再次解析而无法审核的问题；统一字段现在校验实际 JSON 值，集合层的类型/身份/危险文本与权限检查保持。此验证不是前台渲染、全字段业务语义、常驻安装或正式发布验收。运行证据见 [R74](../reports/payload-all-game-coverage-2026-11-07-r74/README.md)。

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

`unified:production audit-local|audit|upload-previews` 与无凭据本地准备入口分离。请求 JSON 只允许 `schemaVersion:1`、`kind:unified_production_preview_request`、`repo`、六个必需 `{path,pin}` 输入（`localPreview`、`editorial`、`selection`、`active`、`application`、`sourceHandoff`）、可选的同型 `preservation` 输入及精确 `sourceRunID`/`executorRunID`；拒绝 verifier、transport、skipCI、临时 owner 和推广标记。命令显式传 `--request`、`--pin`、新 `--output`，只有上传预览另需 `--release-key`。

本地预检用 `GACHIA_CMS_REVIEW_TOKEN` 读取固定 `http://127.0.0.1:3100` 正式审核，不传入数据库配置或记录正文；核对实际游戏/来源、published/hold、审核摘要，重新三方编译，要求全部候选与原冻结一致。安装路径必须仍由 settings 指向，源码清单与冻结提交逐字节匹配，应用/build ID 及附加 release 文件重新验 pin。准备前后正式审核不变。`audit-local` 不接受云凭据获得权限，输出仍不可激活。

完整云预检还要求两个精确提交的完整 CI，包括未跳过的 CMS/发布工具/公共消费者与类型检查；执行器代码必须已提交且字节一致。使用 `CLOUDFLARE_API_TOKEN` 只读重取七服务拓扑、活动 UUID、绑定、预览设置及原始模块证据的当前不可变元数据。旧 source handoff 仅作 pin 入口，不能充当新鲜观察。上传入口固定调用上述 verifier 和适配器，按正确 environment 执行封存 no-bundle 模块，只允许候选/兼容恢复精确云预览；没有部署/切流命令。

`unifiedEditorialScope` 已区分本批 A→B 与 O→B 保留 overlay，当前真实审核为 Main 编辑、原神/异环保留。分类不自动缩减上传 owner，`preservationOwnerOmissionAuthorized:false`；只有另行证明活动运行时已完整承载公开 A 才能跳过。独占 journal、上传时强 ETag/不可变模块、完整精确云 Host HTTP 与独立重验保持，未知结果不重试、只读对账。实际工程/诊断见 [R47](../reports/payload-unified-production-2026-11-06-r47/README.md)，目前没有统一云上传或推广，原双游戏守卫不变。

R48 为上述证明增加受限 reader。`preservation` 指向 `{schemaVersion:1,kind:unified_preservation_catalog_selection,catalogs:{genshin:{path,pin},nte:{path,pin}}}`，集合必须精确等于保留 owner，不能携带通过状态或授权标记。只接受原始已完成发布 catalog，重读完整构建/云预览/公网接受/source-advance 链，全部游戏来源与 A 相同；只允许已验的攻略保留 overlay，其他来源核对该历史发布精确源码。再绑定当前活动 UUID/原始上传模块及不可变资源、服务语义，不能把历史 NTE Main 当作当前 Main。Main 候选/恢复 HTML 不得引用省略站资源。全部通过才将上传 owner 收敛至 Main，原三 owner 构建和完整 A 保持。缺少或不匹配任何证明仍阻止上传，不放开其他游戏领域。实际验证见 [R48](../reports/payload-main-only-preservation-2026-11-06-r48/README.md)。

唯一代码差异例外是已审查的 `apps/game-nte/lib/data.ts` 精确历史/当前 SHA 对：该差异只改语言 reader/类型，不改四个内容单元；已有 TypeScript literal parser 再核对全部内容值及具名 reader 集合，任何其他字节或内容差异拒绝。此处保留原活动 NTE reader，不发布新版语言策略；第 2 项仍需独立验收。

每个写前仍重读证据与云模块身份，只有真实观察时间可单调更新，release key、内容、模块与省略站身份不得变化；不得修改旧云预览的验收时间延长有效期。本机 catalog 复验只证明历史完整性，`audit-local` 不产生 Main-only 云授权。

### R49 已知恢复观察续接

R48 的实际上传只完成恢复 UUID，首个 HTTP 连接在零观察处失败，候选未尝试，基线未漂移。原上传器和失败 journal 均不可重跑或修改。`unified-preview-completion.ts` 仅接受这一已知恢复、零 HTTP、无候选意图的完整 pin 链；新独占尝试先重新观察现有恢复 UUID，再仅首次上传候选，没有恢复重传或推广能力。新旧执行器都要求精确完整 CI，release key 保持原值。

预览读流量可经显式无凭据 loopback 代理，不改变系统配置或 TLS 校验。`streaming-v2` 对绑定旧/新解析器的独立 pin 比较文档 title 及完整 hreflang 属性/数量，允许这两类元数据的流式输出位置变化；正文、链接、媒体、JSON-LD 及脚本/样式顺序继续严格比较。默认 legacy-v1 和所有历史 pin 不变，旧证据不得改签。完整恢复 1,267 项只读诊断已通过，实际续接及正式闭环状态见 [R49](../reports/payload-main-promotion-2026-11-06-r49/README.md)。

精确完整 CI `42148840745` 通过后，实际受限续接已完成：不重传恢复，仅首次上传候选，恢复/候选各 1,267 项响应通过；完成收据及原停止链已独立重读。公众 A 没有切换，这些旧观察不自动延长后续时效。

推广基础协议及完成态 reader、Main 专用写入/公网验证、只读对账已纳入 release 套件。固定 CMS `unified:promotion` CLI 当前只接受 `audit`，必须提供生产请求、原审计、完成收据、网络选择的外部 pin 和当前精确完整 CI；不能传 owner、依赖注入或跳过验证。它没有开放 `promote`/`recover`。固定只读对账 CLI 仅重读指定 promotion journal 与当前拓扑，不授予公网接受、恢复或来源接续。Main 兼容恢复核心的隔离测试不代替固定生产恢复、统一五 owner 来源接续和真实公网验收；这些余项闭合前第 1 阶段仍不能销项。

R77 源码生产资格为 ananta、aniimo、endfield、guihuan、hi3、roco、roco-cn、skjh、starrail、wuwa、zzz 的既有攻略中文 `/content`，每次一条，其余字段/语言必须与公开 A 相同。原 Ananta `download-install-guide` 保持旧策略结果以兼容历史回执。其他游戏/内容、多条批次不能用通用 JSON 和 published 绕过后续领域/消费者验收；保留 owner 未闭合时仍拒绝上传，新执行器也仍须精确完整 CI 和安装核验。这不是“所有内容已可正式更新”。

### R50 历史发布与恢复接线

`unified:history audit|previews|published --request FILE --pin SHA256 --output NEW_FILE` 是固定只读入口。`audit` 接受只含生产请求/原审计 pin 的历史请求，直接从原精确 Git 提交重建 O 和原计划，重读冻结源码/完整 A/审核/构建/兼容资源/transport，并重开五 owner 的原始模块及两种来源证明。它不读取当前 CMS、不要求旧应用仍为当前安装、不将今天活动的 Main 当作历史来源；源与原执行器完整 CI 重新认证读取。`previews` 还绑定历史请求、两版本原完成收据及原执行结果，重读停止链、所有 HTTP/模块/版本并重新核对预览执行器 CI。

`published` 额外要求正式推广收据，固定组合重新核对推广执行器 CI、独占 journal、当时有效的 renewal、不可变模块、切流创建/复查的原始响应及全量公网接受；停止、缺项、重签响应、未知 CI 均不能变成新来源。Main writer 将两个切流响应的状态/长度/SHA 绑定进推广 journal。历史 reader 的身份完整性与写前时效已拆开：旧证据可读不等于能再次上传或推广，写路径的 15 分钟门禁保持，历史时间不改签。

`unified:recovery audit` 接入固定恢复适配器，但写组合仍私有，不提供 `recover` 或重试命令。它从历史证据重建原基线，核对停止的推广 journal，要求入场时确为原已知候选；重新核对五源/两预览不可变元数据，拒绝未知版本、分流和其他服务漂移。内部组合重新观察原兼容恢复 HTTP、独占写入意图、切流后验证完整公网内容，不查询现在的 CMS 审核，不用原始 Main UUID 冒充兼容恢复。固定组合仍须与 source-advance/下一批入口一起做完整隔离验收后才能开放。

R50 的真实只读复验、初次历史时效错误及修复后的执行分别记录在 [R50](../reports/payload-unified-history-2026-11-06-r50/README.md)。这些实现不表示 source-advance 已完成，也不代替当前执行器精确 CI、新鲜预览续验、真实切流和下一批接续；第 1 阶段仍进行中。

### R51：统一来源接续与下一批

`unified:source advance|baseline|prepare --request FILE --pin SHA256 --output NEW_DIRECTORY` 只写本地来源/验收记录，不上传、切流或修改 CMS。三类请求分别为 `unified_source_advance_request`（已完成发布的 `publication` pin、`executorRunID`）、`unified_next_source_request`（再加 `sourceIndex` pin）、`unified_next_publication_request`（改为 `handoff`、`build`、`expectations` pin）。每类另有固定 `schemaVersion:1` 和对应 `kind`，不接受 owner、传输实现、通过标记或跳过检查参数。

`advance` 固定重开已完成发布的整个历史、审核、构建、两预览、推广、部署、全公网及精确 CI 链。Main 仅用已接受候选的实际封存 Worker 和兼容静态并集；其他四站复用各自完整原来源，不能取历史原神/异环 catalog 中的 Main。全部 115 来源从封存源码取得，包括非公开代码和派生输入；90 份公开 JSON 同时匹配新 Main 资产及已接受公网引用。再取七服务前后拓扑、五站不可变版本前后身份和完整 Main 公网观察，生成五 owner `source-index.json`，不把历史复验当成当前观察。

`baseline` 重读该完整索引并取独立的新鲜观察，输出 `active.json`、五 owner `previous.json` 和 `source-handoff.json`；代码 A 不重新退回旧 Git，交接的 15 分钟时效从整段观察起点计算。历史索引过期仍可读，但新鲜交接过期必须重新只读观察。`prepare` 重开已完成发布与索引、核对新鲜交接及下一批完整 A，再精确选择本批构建目标的旧产物，调用既有本地候选/恢复准备器；索引本身不删减 owner。它不扩大当前 Ananta 单条试点生产资格，也不替代下一批 CMS 审核或现存领域守卫。

R51 覆盖 38 项来源协议隔离测试、三方编译器跨游戏保留回归及真实推广协议完成态到来源接续的缩小数据集联合隔离测试。提交 `321f6f9` 的精确完整 CI `42161996721` 随后已独立验过，不覆盖后续执行器修改。固定恢复与来源完整请求级联合资格、实际推广/公网接受/来源接续仍分别是未完成项。没有真实完成推广收据就不能运行生产 source-advance；所有新结果均保持 `cloudWrites:false`、`activationSupported:false`、`newPublicationAuthorized:false`。见 [R51](../reports/payload-unified-source-advance-2026-11-06-r51/README.md)。

### R52：固定入口组合与失败输出

新增固定请求的独立进程组合测试，使用合成五 owner/115 来源/90 公开对，执行真实的完成态 reader、模块/renewal/部署/公网证据重读、来源接续、新鲜下一批和本地候选/恢复准备。私有恢复写组合仅由测试进程加载器访问，线上导出与 CLI 不变；未知写结果保留 journal 并停止，即使已知候选再次活动也拒绝重试。测试替换历史入口、当前执行器、云拓扑和构建验证边界，并以受限本机 HTTP 代替 OpenNext 进程，不是完整生产资格或真实切流。

来源/下一批协议成功后若最终执行器检查失败，固定适配器保留 `failure.json`；后续 reader 拒绝该目录，不能复用协议收据冒充成功，也不覆盖失败目录。来源、下一批准备和恢复入口在异步验证前复制固定请求；后续验证及返回收据只使用同一份已校验的 pin，不再次读取调用方可变请求。

R52 提交 `ab7101c` 的精确完整 CI `42171819151` 随后已独立复验，不覆盖后续执行器修改。没有开放推广/恢复写命令，没有扩大 Ananta 单条试点资格，没有安装或修改常驻 CMS。见 [R52](../reports/payload-fixed-adapters-2026-11-06-r52/README.md)。

### R53：下一批正式来源与历史读取

生产验证器同时接受旧 `unified_observed_source_handoff` 和新 `unified_next_batch_baseline`。新格式必须重开上一完成发布、完整五 owner 来源索引、独立新鲜观察和全部 115 来源 A（含非公开代码）；精确绑定本批 active、冻结基线与 previous 子集。旧 Main 产物、旧 Git A、删减索引或缺少代码来源均不能用于下一批。写前重新读取全部五个不可变版本，交接在读取中到期同样拒绝，不使用历史游戏 catalog 覆盖已发布 Main 增量。

历史读取不依赖今天的 CMS 文档或活动 Main，不刷新时间；它验证原审计处于原交接有效区间，并保留完整 provenance 和完成态祖先。独立验证入口重验所有祖先 CI。回溯按独立异步上下文拒绝循环和超过 32 批的历史，不能从请求传入绕过标志。该合同支持后续来源接续及兼容恢复读取，不意味着自动授权新一批上传。

独立进程回归包含连续两批完成态→新来源接续、五模块正式来源验证、过期历史离线读取及祖先 CI。历史入口、当前执行器、云 snapshot 和构建验证边界仍有替换，不等于无替换的完整生产资格。下一步补该固定链路资格，再做新鲜续验、真实受控推广、全量公网接受和实际来源接续。当前试点范围、常驻安装及 CLI 写权限均不变。见 [R53](../reports/payload-next-production-2026-11-06-r53/README.md)。

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

R117 可在上述命令同时追加 `--preview --genshin-only-local`，仅用于已列明的胡桃英文名称本机用例，不能用于 `plan`、`import-local`、`export-local` 或正式导出。输出 `localScope:genshin-only-local-v1` 及待办；构建/发布回执保留该范围，移除范围或重签 owner 集合仍会被重开校验拒绝。前置产物必须恰好只有原神，raw A 必须匹配完整基线，raw B 必须匹配候选；无需提供 Main 发布产物不等于 Main 读回已验收。标准真实构建仍需 14 GiB 可用预算，不因单 owner 降低门槛。

该路径仍要求包含迁移实现的精确 Git 源码，不会自动把工作区未提交代码放进冻结目录。本轮仅验证工具合同与隔离编排；真实 B 页面构建、同批固定 Main 读回/故障/恢复和单 owner 来源接续尚未完成，禁止将预览回执标为正式可发布。公开内容来源认证不作为前置。

## 剩余边界

页面 TSX 内联事实、其他尚未适配的代码内容、实体新增/撤回、字段结构扩展、媒体替换、全类型语义与跨引用、其余 scope 常驻接管和全 owner 正式发布仍未完成。首批常驻安装与真实审核不等于所有游戏已可上线。下一顺序见[实施队列](../plans/payload-all-content-implementation-2026-11-05.md)。
