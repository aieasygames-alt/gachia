# R38 新增原神指南工程切片

日期：2026-11-05。目标是从“只能维护既有指南”推进到可新增文章，不再重复旧上线验收。本轮**交付源码、独立CMS构建/真实隔离PostgreSQL HTTP和Genshin/Main实际loopback Worker验收；未升级常驻CMS/发布器、未向生产新增内容、未上传或部署Worker。** 当前已上线限定V1保持可用，新增能力不冒称已安装/已公网验收。下一工程入口见[新增契约](../../docs/payload-new-guide-contract.md)。

## 1. 本轮关闭的工程项

| 子项 | 实际结果 |
| --- | --- |
| G1 新记录身份与批准 | 原神`cms-`命名空间、真实game关系、source模板、碰撞保护及身份不可变；editor创建draft/hold、reviewer批准，经真实Payload Local API及隔离PG上的REST HTTP验证 |
| G2 新增导出与前向保护 | 保留Git导入O前缀与未知字段，新增后缀稳定排序；明确added/合约版本，inspect和双owner冻结重新验实际字节。公开A的旧字段不得隐式退回O，CMS新增记录不得悄悄消失 |
| G3 消费与恢复工程 | 实际新Worker的列表/详情/canonical/metadata/JSON-LD/sitemap/fallback/static/Main JSON通过；版本绑定baseline允许真正新增前URL404，旧文章必须200；旧Worker实际三语言404/noindex及列表/sitemap不含新URL |
| G4 常驻安装与真实新增上线 | **未完成**：本轮没有切换安装、真实新增文章、四版本云验收/推广、真实新增partial恢复或来源交接。不用G1–G3替代G4 |

仅启用**原神中文、无媒体/新关联、固定初始摘要和通用category**的新增协议。NTE既有文字更新保持；NTE新增因默认中英文索引/读取行为需独立消费者适配，当前明确拒绝。删除、任意ID/URL/顺序/元数据编辑、翻译和其他类型不包含在本片。

## 2. 实现边界

- CMS数据构造器只生成正常API入参，不写库、不发token、不替代审批。collection hook验证不可变身份/source与实际game；正式导出要求published及明确hold=false。既有权限、文档锁和draft/formal隔离保留，无schema迁移或新公开端点。
- 新sourceRecord使用独立CMS来源信封，不伪造legacy sourceRecord。公开数据仅有固定cmsOrigin标记；文字预算与`<`/NUL拒绝防止新增JSON-LD script关闭，不是内容事实审核。
- inspect绑定实际added与显式合约，继续冻结两份JSON和`[genshin, main]`所有权。当前A→B删除保护也涵盖CMS出生的新指南，另一游戏保留/900秒/显式恢复等原门禁不放宽。
- 新增时云端封存、恢复封存和公网路径增加三语言列表，指纹绑定列表真实链接。详情200仍要求canonical/metadata/JSON-LD；404仅按版本绑定A的实际身份允许，要求noindex、无文章canonical/JSON-LD与真正404错误形态。
- CMS与独立publisher合约副本逐字节校验；初装脚本纳入新模块。**只修改安装脚本不等于更新了当前运行安装**，当前仍698应用/28工具。

## 3. 新鲜验证

本机最终CMS **179/179**、typecheck、CMS production build通过。隔离PostgreSQL 17.6、非超级用户/禁schema push、重复迁移及构建后真实HTTP共12组通过，涵盖新建草稿、重复ID拒绝、editor批准/改身份拒绝、reviewer批准、正式导出、错误game拒绝，以及旧锁/restore/logout/私有媒体和故障503。

最终发布工具 **814/814**、其余Node **304/304**、Python **49/49**通过；新增/前向/恢复定向 **68/68**通过，包含旧文章不能伪装新增404、404证据不能改200、缺noindex/带文章canonical/JSON-LD拒绝、连续新增/编辑/缺记录拒绝等。新增列表链接的篡改与Router只重写200 HTML缓存的回归另纳入814总数。

真实Genshin+Main双owner构建完成；最终本地候选HTTP **19响应**（Genshin16/Main3）通过，另以R36已接受Genshin制品副本执行旧版HTTP **7响应**，三语言新URL均404。旧制品原件与副本前后SHA保持。最后一次验收保存全部响应body/headers，前置失败记录不覆盖。

隔离候选使用一次性SQLite中的真实角色/Local API生成，固定preview=true，并从私有临时Git快照构建，不是生产批准候选。它只包含fixture新增，未复现当前所有公开A的编辑；**不能用它向当前生产推广**，真实下一批仍须从在线CMS正式记录完整导出并通过公开A保护。旧制品UUID/来源来自R36封存，未重新读取Cloudflare控制面，不称当前云UUID新鲜验收或新增partial部署已验。

最终维护分支精确提交的验证型GitHub CI身份/结果由本机`delivery.json`单列；未携带云部署凭据、没有运行生产workflow，不用旧CI冒充本轮结果。

## 4. 实测问题与修复

1. 新增正向测试最初按预期失败：旧导出拒绝新增记录，保留`export-red.log`；在新增合约、正式身份和清单实现后转绿。Payload create的originalDoc可能是空对象，修正为仅update比较历史身份，权限断言未放宽。
2. CMS首次构建失败：Next独立根不能解析仓库根scripts合约。改为独立根各带同字节合约、测试强制同步；第二次CMS production build与实际PG/HTTP通过，不扩大Next追踪根到整个仓库。
3. 首次旧Worker404取证失败：真实Next 404以Flight错误边界返回，无直接h1；校验改为识别精确404 digest且保持HTTP404/noindex/无文章canonical/JSON-LD。新attempt保留两种形态的拒绝回归，最终三语言实测通过；没有改成接受任意空HTML。
4. 私有快照首次git apply使用绝对directory被Git拒绝，尚未patch即停止；改在拥有的临时Git目录相对应用后成功。没有覆盖用户仓库或生产内容。
5. 最终多Worker源码复核发现Router只重写200 HTML缓存，旧public mapper却会重写所有HTML；本轮新增404恢复响应必须保留Worker原缓存策略。已将映射限定200并加真实404/public校验回归，不修改Router或放宽缓存比较。

## 5. 现有运行保持

只读复核常驻CMS/PG healthy且loaded、安全HTTP9/9、698应用文件/28工具相对R37完整摘要不变；DB仍84内容/1用户/1媒体、82draft/hold及双游戏各1eligible published，完整DB摘要仍`7fb83e21f6a68ea89a08234cb673ffc20a270d2ec7448bd8c2230bd32e044c83`。本轮新增记录仅存在于拥有的临时数据库，测试结束均清除。

四公网只读样本保持R36两篇文字与两个JSON精确SHA，fixture从未出现在公众响应。没有内容/hold/用户/媒体写入在线库，没有OAuth刷新、Cloudflare控制面查询、Worker上传/部署、R2对象或密钥写入；不称已再次验云拓扑。最新异地包仍是R37，不含本轮尚未安装的新代码。

本轮临时构建消耗磁盘，完成时约13GiB可用，仍高于手册预警10GiB/停止新构建8GiB；未清理历史证据或发布目录，不把测试临时库清理当GC交付。没有新依赖audit/升级，R37的1low未修复与2026-11-16复核截止维持。

## 6. 当前状态与最短下一步

- 修订限定V1、C01/C02/C03/C04/C05a保持完成；C05b仍未完成/用户暂缓，不要求独立key或第二Mac。
- 本轮新增指南的G1/G2/G3工程关闭，**G4安装/真实新增发布未完成**；原P0–P5/P7部分完成、P6未完成；T01完成/T02限定本地完成、T03–T08/T10–T12部分完成、T09未完成，不整体提升。
- 下一顺序：精确提交CI及有界新应用/工具暂存验收→冷备切换/完整性验证→代理策划一篇真实中文新增先入CMS并走完整双owner云链/来源交接→刷新异地包，再推进NTE语言与新增切片。
- 不发布fixture、不重放旧journal、不要求用户写测试文章；不以全量内容准确度、翻译、通用队列或重审已有V1来阻塞可用更新。

## 7. 本机证据

Git只提交本README与产品源码/操作文档，不提交数据库、凭证、原始回执、生成制品或日志。

- `export-red.log`、`cms-focused*.log`、`cms-tests-final.log`、`typecheck-complete.log`、`cms-build*.log`：拒绝基线、完整测试及真实构建修复。
- `postgres-http/`：隔离PG/构建后HTTP及新建/批准/导出、旧安全回归，生成凭证已脱敏且临时服务清理。
- `isolated-candidate/`、`cms-isolated.json`、`source-snapshot.json`、`prepared.json`、`built.json`：隔离输入、来源、pin及双owner构建，不可用于真实推广。
- `http-attempt2/`与其`preview-final.json`引用的preview目录：19份候选及7份旧Worker实际HTTP，body/headers与SHA留存；前次404失败日志保留。
- `release-tests-complete.log`、`additive-focused-final.log`、`local-final.json`、`public-final.json`、`prior-sealed-reports.json`：回归和现有运行/既有封存只读核对。
- `delivery.json`、`evidence-index.json`：提交/CI与本轮排除自身的本机证据索引；封存后不改写本轮记录。
