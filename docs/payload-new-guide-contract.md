# Payload 新增指南：首个工程切片

更新：2026-11-05 R38。**原神中文新增指南的源码、构建和隔离HTTP验收已完成；尚未升级常驻应用/发布器，也未发布真实新增文章。** 当前已安装能力仍是R36双游戏既有指南文字更新。不得仅凭本文件或CMS的published状态宣布新增文章已上线。证据见[R38](../reports/payload-new-guides-2026-11-05-r38/README.md)，当前范围见[代理工作流](payload-agent-publishing-workflow.md)。

## 1. 为什么先原神

Genshin的列表、详情、canonical、JSON-LD、缺译文回退/noindex和按语言过滤的游戏sitemap已有可用消费者，新增指南可以沿用这些路径；HTML仍由Genshin Worker负责，公开JSON仍由Main负责。Router、staging、其他游戏与玩家账户不变，不新增Mac公网回源。

NTE既有文章更新保持支持，**NTE新增指南仍拒绝**。它目前默认中英文详情可索引，不能把原神的中文新增合约直接搬过去，否则可能把空英文页提交索引。后续独立修正NTE语言消费者，不强制为上线补齐译文。

## 2. 新增记录契约

- 代理先形成真实文章，再用`desktopNewGuideDraft`生成普通Payload写入数据，通过固定loopback的已认证API、`draft=true&locale=zh`创建。函数只是数据构造器，不写数据库、不代表授权；不使用SQL或`overrideAccess`绕过角色/锁。
- 新ID为最长100字符的`cms-`命名空间slug；stableKey、game关系、kind、legacyPath、bodyFormat和sourceRecord必须对应同一Genshin身份。数据库唯一约束拒绝碰撞；创建后身份/原始模板不可改，不能把旧导入记录改造成新增记录。
- 新记录保留`sourceRecord={desktopGuide:1,game:'genshin',guide:<初始模板>}`，不伪造Git导入O。公开JSON仅增加固定`cmsOrigin`标记，不公开CMS用户、数字ID、审批证据或私有路径。
- 首片仅中文title/summary/body。正文至少80字符且最多200000字符，标题/摘要最多300字符；这是消费/字节预算，不是事实质量评分。英日文字字段保持空，缺译文由已有原神消费者回退阅读、noindex并排除于sitemap。
- category固定为通用指南，tags/FAQ为空，无图片、日期、任意SEO扩展或关联字段。摘要在初始模板中固定；后续只能编辑中文title/body。改摘要、翻译、媒体或其他固定元数据须另建契约，不直接修改sourceRecord。
- 新文字不接受`<`或NUL；既有详情直接嵌入JSON-LD，本片不能通过文字关闭script标签。没有新增媒体发布或第三方权利批准。
- 默认draft/hold=true；editor不能批准，admin/reviewer明确published/hold=false后才能进入正式导出。无效文本即使在CMS获批也会在导出被拒绝。draft预览始终带preview=true，不具备正式推广资格。

## 3. 导出与双Worker保护

1. 保留原Git指南前缀及未知字段；CMS新增记录组成按ID排序的后缀，与数据库查询顺序无关。新记录可插入该后缀的排序位置，但已发布记录的相对次序不能改变，不是任意重排。
2. 候选需明确`guideContract=additive-v1`及`added`清单，inspect重新从实际JSON推导清单并验摘要。`added`是相对导入O的CMS新增集合，不等于“相对当前公开A本次才新增”的集合。
3. 当前公开A→候选B仍逐条校验；既有文章A→O隐式重置继续拒绝，已公开的CMS新增记录若被hold/删除后从候选消失也拒绝。不会自动替运营者保留A、解除hold或撤下网站。
4. 仍仅按序写`[genshin, main]`，必须保留NTE当前公开JSON。源码/两份JSON、制品、UUID、四版本预览、900秒新鲜门禁及partial显式对账/兼容恢复沿用，不引入原子ReleaseMap或普通请求全链releaseKey声明。
5. 新增候选额外采样三语言列表和详情；列表指纹包括真实链接，不能只比较卡片文字。中文URL须出现在游戏sitemap，空英日译文不得进入sitemap，fallback须可读且noindex。

CMS和独立publisher需要各自完整构建根，因此合约模块在CMS源码和`scripts`各有一份**字节相同副本**；CMS测试强制验相等，修改后必须同步，不维护两套语义。安装器会复制新的publisher模块；不能只更新调用方而漏装依赖。

## 4. 新URL的恢复语义

恢复目标是当前公开A，不是导入O。通过旧UUID绑定的baseline确认：若该CMS新增ID在A已存在，恢复必须200；只有本候选新增且A中不存在的URL才允许404。所有旧文章仍必须200，不以“新增”理由掩盖丢页。

兼容恢复需覆盖三语言列表、sitemap、详情及旧/新静态资源；缺失URL必须有真实404、noindex、无文章canonical/JSON-LD。支持已有Next输出的两种形态：直接渲染404和带`NEXT_HTTP_ERROR_FALLBACK;404`的Flight错误边界，不把任意空壳当404通过。云精确预览/公网/恢复后来源读取同步识别状态和指纹。

R38实际启动了新增候选的Genshin/Main Worker，并另启R36已封存旧Genshin制品，证实新增前URL三语言均404且旧列表/sitemap无该URL。**这不是新增文章的真实云端partial故障、四版本验收、推广或恢复演练**；这些仍在首篇真实新增发布时验收。

## 5. 退出条件与下一顺序

1. 对精确提交完成验证CI；按已验证的独立构建边界暂存新应用和publisher，验证安装包自身HTTP与完整性，冷备后有界切换，保留旧版可回退。当前常驻版本尚未升级，不要求用户手动搬文件或编辑测试文章。
2. 代理选择一篇真实原神中文新增指南，先认证写CMS、重读/批准，再运行完整新run、候选/恢复四版本、900秒、双owner推广、公网/source-advance与NTE共享Main交接。不得发布R38 fixture凑验收，不重放旧journal。
3. 更新当前数据/工具/源码异地包，再独立推进NTE缺译文与新增适配。删除、媒体、其他类型、整机灾备、全范围P/T任务不随本片自动关闭；C05b独立key继续用户暂缓。

这组扩范围工作不阻塞当前已经可用的既有指南更新，也不重新增加内容准确度、翻译或第二Mac门槛。
