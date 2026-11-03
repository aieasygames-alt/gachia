# R25：跨游戏共享 Main 的受控来源重绑定

日期：2026-11-03。承接[R24](../payload-source-advance-2026-11-03-r24/README.md)的下一工程优先级。目标是减少本机连续发布的手工来源交接，不做内容准确度审核或重复staging调查。

**已实现并安装`publish-source-rebind`：目标游戏保持原UUID/公开A，显式只读组合另一游戏完整成功发布的新Main来源。** 本轮关闭实现、隔离验收和本机安装子任务；没有真实文字候选或成功本机云发布，所以没有实际运行生产重绑定，不称为真实云E2E完成。

## 1. 解决的问题

来源目录按game/Main UUID固定索引。Genshin发布更新共享Main后，NTE即使未变也不能继续选择旧Main来源；反向相同。不能直接复制另一游戏条目修改game/UUID，也不能默认新Main里的NTE内容还是A。

新增入口不要求或生成候选run、plan pin、releaseKey。四个必填参数为目标原始来源manifest路径/pin和另一游戏新来源manifest路径/pin：

```sh
cms publish-source-rebind --source "$TARGET_SOURCE_MANIFEST" --source-pin "$TARGET_SOURCE_PIN" --main-source "$NEW_MAIN_SOURCE_MANIFEST" --main-source-pin "$NEW_MAIN_SOURCE_PIN"
```

- 目标支持原始retained/recovery、R22历史source-only、已成功发布来源。Main仅接受另一游戏的`published_candidate_source`，重新验证完整七阶段推广journal、封存bundle/保留树、全部保存公网正文及pin。
- 目标游戏必须仍为原100% UUID；历史拓扑只能解释为另一游戏/Main的部署变化，bindings/settings/routes/domains/subdomains/服务集合仍相同。当前七服务必须与新Main登记时一致，前后漂移、split、未知/外部/恢复版本均停止。
- 新Main源文件与新鲜精确版本`/data/<target>/raw-guides.json`均须等于目标上一公开A，而非最初导入O。新鲜版本绑定baseline仍保存O/A两份正文，不猜内容、不静默接受另一游戏发布夹带的目标变化。
- 目标指南三语言、body/metadata/JSON-LD/media/robots、双方sitemap、Main账号停用、全部登记静态、双模块/版本配置、noindex/无cookie/cache均重验；目标静态仅按已pin的当前游戏capture，不把恢复树中forward-only新候选chunks冒称已在线，新Main仍重验全封存引用；下载multipart与runtime匹配，全部响应正文及版本证据持久化。
- 原来源树/目录不写，输出组合资源证据及新固定game/Main条目；新Main沿用真实本机发布bundle/journal来源，不伪造GitHub artifact ID。已有或不完整条目不覆盖；后续select重验父来源、baseline、保存HTTP和新鲜网络输出。
- 不接受重绑定条目作为父来源，避免递归证据图；目标自身UUID未变时，后续交接继续引用同一原始游戏来源。目录仍依赖原始run，不是自包含备份或发布批准，不延长15分钟授权。

## 2. 验证与安装

| 项目 | 结果 | 结论范围 |
| --- | --- | --- |
| 新重绑定回归 | **47/47** | 双方向、historical/retained/published目标、A非O、Main下一轮retain、排他登记/再选择；云控制面/成功发布为fixture |
| 实际loopback HTTP | **1项**，包含于47 | 真实服务器/客户端、正文落盘；不代表真实Cloudflare新发布 |
| 定向最终回归 | **236/236** | 来源目录/接续/重绑定、本地证据、CLI、手册 |
| 完整发布回归 | 桌面 **547/547**、既有Node **304/304**、Python **49/49** | 无新依赖，不重跑无关公众应用build/parity |
| 本机工具安装 | **22模块+manager=23文件** | 维护锁、备份、原子替换、依赖闭包、安装后hash及实际manager缺参拒绝；smoke网络调用0 |
| 本机安全与数据 | HTTP **9/9**、CMS/PG健康/loaded、DB摘要不变 | 84draft/hold、0eligible；无内容写入或CMS应用覆盖/重启 |
| Worker盘点 | **10观察/7保护**，与R24一致 | 发布目标仍game+Main，未扩展Router/staging权限或新增Mac运行时依赖 |

首轮新增测试因fixture未包含目标游戏settings失败；修复测试拓扑后保留失败日志。旧fixture提取为两个共享测试helper，既有目录/接续测试继续全部通过。自审修正了目标恢复树可能包含尚未上线的forward-only chunks：新增明确scope及回归，只对已pin的当前游戏capture作云静态声明，不降级新Main全部封存引用。版本binding比较复用既有canonical identity，接受API顺序变化而拒绝未知/变化binding，增加正反回归，避免合法来源被数组顺序阻断。另增加真实封存的新Main包含O时的明确拒绝、robots变化拒绝、无run/releaseKey的严格CLI以及安装依赖闭包回归，不通过跳过校验获得绿灯。

本机没有重跑CMS/typegen/typecheck/Router全套；最新本机基线沿用R22，精确交付提交的实际只验证GitHub CI身份记录在本地`delivery.json`，不套用R24 run。依赖1low和账户级“仅本机发布”未强制等R23边界沿用，不新增审计完成声明。

## 3. 更新任务与下一步

1. **L06/T12：关闭“跨游戏共享Main新UUID受控重绑定”的实现/隔离验收/安装子任务**。真实云重绑定、首次可信来源、外部部署/手工恢复后的交接未关闭。
2. **L04/L05仍待真实预期公开的文字候选**。有候选即优先Genshin首次云发布→source-advance→另一游戏source-rebind→第二次/兼容恢复及NTE；不等准确度、不制造演练编辑、不批量清hold。
3. 无真实编辑时，下一工程优先级是**现有本地发布前证据准备流程编排**：减少source-select、资源刷新、baseline、本地兼容恢复之间手传pin；固定输入/中间结果及失败恢复，不把上传/推广变成后台自动写入。
4. 独立key/第二Mac、真实云partial failure/恢复、普通请求全程releaseKey及全scope权威接管仍待验，不用新增测试数量替代真实验收。

P0–P5/P7仍部分完成、P6未完成；T01完成、T02限定本地完成、T03–T08/T10–T12部分完成、T09未完成。当前CMS本机可编辑，网站在Cloudflare运行；尚不能声称真实内容发布闭环已完成。

## 4. 证据与交付

入Git仅源码/测试helper、现行文档、本报告与脱敏`verification-summary.json`。本地保留首次失败/最终测试日志、安装备份与hash、实际manager smoke、DB/安全HTTP、只读云盘点、GitHub开关及精确提交实际CI结果，最终身份见`delivery.json`，证据索引排除自身避免循环。不入Git原始正文、UUID控制面明细、凭据、密钥、数据库或私有媒体。

本轮无Worker/R2上传、部署、切流、内容编辑或CMS重启；仅测试、持久工具安装和Git工程交付写入。旧脏checkout不改。操作变量与失败处理见[手册](../../docs/payload-operator-runbook.md)，任务见[当前状态](../../plans/project-task-status-current.md)/[首发清单](../../plans/payload-launch-closeout-2026-11-02.md)，架构见[多Worker地图](../../docs/payload-project-worker-map.md)。
