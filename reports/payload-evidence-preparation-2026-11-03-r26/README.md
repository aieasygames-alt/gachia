# R26：本地发布前证据准备单入口

日期：2026-11-03。承接[R25](../payload-source-rebind-2026-11-03-r25/README.md)下一工程优先级，减少已有发布流程中的手工路径/pin传递，不新增内容准确度门槛或云写入自动化。

**已实现并安装`publish-prepare-evidence`，关闭本地编排的实现、隔离验收和安装子任务。真实文字候选的云预览/推广/恢复仍未验收。** 不把新增fixture/loopback或当前公众基线采样算成真实上线。

## 1. 新入口与固定边界

```sh
cms publish-prepare-evidence --run "$RUN" --pin "$PLAN_PIN" --repo "$REPO"
```

只接受已构建的非preview候选，双owner完整、冻结源码/制品/plan pin一致，且文字相对当前公开A确有变化；只变JSON格式也不能凑一次发布。不自动导出、build、首次来源托管或登记，不接受任意game/URL/Worker/account/force/skip。

1. 验证候选，从plan固定sourceCommit读取Git导入O，而非repo当前HEAD或latest。
2. 按当前game/Main UUID选择并重验已登记可信来源；支持既有retained/historical/published/rebound来源，不放宽父来源资格。
3. 重新读取精确game模块，采样全部已登记game/Main公众静态字节，生成本轮资源证据。
4. 使用刷新证据执行retain，派生候选保留树，旧来源和原始候选不覆盖。
5. 从精确当前Main取得公开A，保存O/A正文和绑定双UUID的baseline；不是恢复O。
6. 下载精确当前runtime到派生副本，合并前向静态；运行临时loopback恢复，比较三语言页面正文/metadata/JSON-LD/robots、Main JSON、sitemap、静态及账号停用响应。
7. 再次选择/重验全部来源依赖，并将开始/资源/基线/结束七服务拓扑相互比较。保存阶段journal与完整文件索引，最后排他写成功汇总manifest。

输出保留manifest路径/pin以及assets、retention、baseline、recovery的实际路径/ID/pin，供现有单步门禁继续使用。**preview-retained、cloud-check、recovery-check、云封存/验证、精确UUID云预览、15分钟授权及推广/公网验收都不可省略。** 固定productionReady=false、cloudRecoveryAccepted=false；离线`verifyEvidencePreparation`不读取云、不续期、不授权上传。该回执不是自包含备份，仍依赖原始私有来源目录。

资源范围仍为已登记清单；不宣称完整Cloudflare资产枚举，也不批准新媒体。公众站点继续独立Cloudflare运行；本机CMS/PG不成为公众请求回源。

## 2. 失败、锁与证据

- 整个流程持有现有run的operation.lock，跨await不释放。retain通过WeakMap管理的活跃不可伪造lease组合到流程，不增加全局可重入锁或skip-lock参数；原retain命令仍自行加锁。
- 每次创建独立evidence-preparation目录。阶段开始/通过追加journal，中间结果与响应落盘；失败只生成诊断，不生成成功manifest。修正问题后重新计算新尝试，不隐式resume、不覆盖或复用半成品。
- 有任何cloud/recovery-cloud/promotion/manual-recovery写journal即拒绝，空或截断也不豁免。中途出现同样拒绝；先对账，不能删journal后重跑。
- 汇总文件索引绑定所有保存正文、headers记录、辅助账号检查、精确runtime、源选择证据、恢复树、配置、日志和阶段结果。离线重验还检查冻结候选、来源传递依赖、资源正文/模块、retained树、A baseline和恢复覆盖，不只验最外层摘要。

## 3. 验证与实机交付

| 项目 | 最终结果 | 范围 |
| --- | --- | --- |
| 新编排回归 | **41/41** | 双游戏A非O、格式同文拒绝、全部阶段失败/漂移、空journal、失败重跑、保存正文/传递依赖篡改、锁capability及并发 |
| 实际loopback HTTP | **1项**，包含于41 | 真实服务器/客户端和正文落盘；云控制面、runtime与发布仍为fixture，不是三生产应用云E2E |
| 定向最终回归 | **295/295** | 编排、来源目录/接续/重绑定、本地证据、retain、CLI与手册 |
| 完整发布回归 | 桌面 **592/592**、既有Node **304/304**、Python **49/49** | 无新依赖；未本机重跑公众应用build/parity或CMS/Router全套 |
| 本机工具安装 | **23模块+manager=24文件** | 维护锁、备份、原子替换、依赖闭包导入、安装摘要及实际manager缺参拒绝；无CMS应用覆盖/重启 |
| 本机安全/数据 | HTTP **9/9**、CMS/PG健康/loaded、DB摘要不变 | 84draft/hold、0eligible；没有内容编辑或正式候选生成 |
| Worker只读复核 | **10观察/7保护**，与R25一致 | 写入权限仍game+Main；Router/staging不扩展，本轮没有上传/部署/切流 |

初次测试的任意响应数量假设与后续新增helper遗漏dirname导入均已修复，失败日志保留；实际HTTP验收改为逐项检查三语言/静态/sitemap/账号路径，不跳过验证。自审增加对当前A的**语义文字**比较，避免格式差异制造发布；增加来源传递HTTP、操作中候选篡改/写journal和所有辅助原文的pin回归。读云首次401后仅通过既有Wrangler刷新登录，再完成只读观察；不新增或扩大token权限。

最终精确工程提交与实际只验证GitHub CI身份保留本地delivery，不复用R25 run。CMS163/typegen/typecheck、Router35/typecheck为既有本机基线，本轮本机没有重跑；实际精确提交CI的测试另按CI日志记录。依赖1low和账户级“仅本机发布”未强制沿用原边界，不增加安全审计完成声明。

## 4. 任务状态与剩余

1. **L06/T12：本地发布前证据准备编排的实现/隔离验收/安装子任务完成。** T12总体仍部分完成；首次未知来源、外部部署/人工恢复来源交接及真实云持续发布未关。
2. **L04/L05：有真实预期公开的文字即优先Genshin首发→source-advance→跨游戏source-rebind→第二次/兼容恢复及NTE。** 当前84draft/hold、0eligible，不造编辑、不批量清hold、不上传诊断，不等待事实准确度或全类型迁移。
3. 独立密钥介质/第二Mac、真实云partial failure/恢复、普通请求全程releaseKey与全scope权威移交仍待验；本轮没有以新增测试替代这些验收。

P0–P5/P7仍部分完成、P6未完成；T01完成、T02限定本地完成、T03–T08/T10–T12部分完成、T09未完成。当前路径的操作步骤减少，不等于整个CMS迁移或真实内容上线已完成。

## 5. 证据保存

入Git仅源码/测试helper、现行手册/任务状态、本报告与脱敏verification-summary。原始失败/最终日志、安装备份/摘要、实际manager smoke、DB/安全HTTP、10Worker控制面、部署开关及精确提交实际CI/delivery仅本地保存，evidence-index排除自身防循环。没有凭据/数据库/私有媒体/原始发布正文入Git。旧脏checkout不改。

详见[现行操作手册](../../docs/payload-operator-runbook.md)、[当前任务表](../../plans/project-task-status-current.md)、[首发清单](../../plans/payload-launch-closeout-2026-11-02.md)与[多Worker地图](../../docs/payload-project-worker-map.md)。
