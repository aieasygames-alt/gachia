# R36：代理策划、CMS 入库与双游戏真实发布收口

日期：2026-11-04，Asia/Shanghai。依据用户调整后的优先级，依次执行NTE真实内容更新、独立Genshin正常更新、修订后的限定V1运行里程碑收口。工程工作树为`/Users/robert/.codex/worktrees/payload-unified-maintenance/gachia`，不是另一份Documents旧checkout。

## 1. 直接结论

**修订后的限定V1运行里程碑完成，已经可以按既定流程更新线上Genshin/NTE既有指南文字。** 两次均由代理规划有实际价值的修改，经认证Payload REST保存草稿、重读完整差异、授权admin批准、正式版本重读，再从CMS导出并完成真实Cloudflare发布；不是直接改JSON、仅fixture或只把CMS标成published。

- C01/C02/C05a保持关闭，**C03独立正常Genshin连续发布、C04真实NTE及双向共享Main连续性关闭**。
- C05b独立密钥仍未完成、用户明确暂缓、移出当前门槛。不要求用户手动编写验收内容、准备介质或在另一Mac运行CMS。
- 当前是**代理受监督执行的CMS-first本机发布**，不是点击published即自动上线，不是无人值守队列。公众访问仍由Cloudflare多Worker承担，Mac关机不影响已发布内容。
- 原始P0–P7/T01–T12全范围没有完成；全类型/全scope、网站撤回、通用激活、普通请求全链releaseKey与完整灾备仍另验。

当前任务入口：[任务表](../../plans/project-task-status-current.md)、[限定V1清单](../../plans/payload-v1-completion-2026-11-03.md)、[内容工作流](../../docs/payload-agent-publishing-workflow.md)、[操作手册](../../docs/payload-operator-runbook.md)、[Worker地图](../../docs/payload-project-worker-map.md)。

## 2. 两次真实内容变更与公开验收

| 批次 | 实际修改 | 公网结果 |
| --- | --- | --- |
| NTE `beginner-guide` | 中文标题改为“异环新手入门指南：基础系统、养成顺序与探索规划”，仅整理开头导读，其余原正文保留 | [线上指南](https://gachia.com/zh/nte/guides/beginner-guide)已更新，标题/可见新导读/canonical/description/JSON-LD通过 |
| Genshin `quick-start-guide` | 保留R32已发布中文标题，开头改为“原神入门路线”并增加基础操作→元素反应→树脂→祈愿的阅读顺序，其余原正文保留 | [线上指南](https://gachia.com/zh/genshin/guides/quick-start-guide)已更新，标题/可见新导读/canonical/description/JSON-LD通过 |

各批次只修改目标一篇中文文字，相对已有CMS草稿其余83记录、en/ja、稳定身份、sourceRecord和媒体保持；未改事实数值、ID/URL、固定元数据或批量清hold。NTE首次正式导入行为空文本，原导入文字在held草稿；批准正确带入原有其他语言，不把正式空行误当应覆盖的语言内容。CMS私有前后完整快照在本机operations目录，不进入Git。

| 项目 | NTE | Genshin |
| --- | --- | --- |
| releaseKey | `d871b48834f4c8fb532ef4d9373930af1a3f93470df60104714e2c540fa16174` | `a19ab8868c3a526ab76085f061f29beef0d739687ff5af69a567ac47f1745f06` |
| 成功run | `d871b48834f4c8fb-9de4281a89af` | `a19ab8868c3a526a-70e930acf99e` |
| plan pin | `8ed78c4dbdf20dfc4b10f8b25120fca95e27422a7752dd34bdf32d7b39f02960` | `91ee47fa17baae685e6becb33b55446f388171cc878b8aa800bc47462ac37aa6` |
| 正式JSON SHA256 | `76536e016c40e9432f396157bec037c0654936738b75cff8807b2d351e3389a6` | `9540b26938f5ac4dd15a56f3ad0afcd5aa55b8aeda740a6b9277037cb314eba6` |
| production_accepted（UTC） | 2026-11-04T13:07:10Z | 2026-11-04T14:54:24Z |
| 推广耗时 | 333.07秒 | 508.44秒 |
| 推广阶段留存公网响应 | game159 / Main678 | game221 / Main729 |

两个候选及两个兼容恢复制品均精确UUID云预览通过，15分钟新鲜续验和写前漂移检查保持；按序game→Main推广后公网/source-advance通过。Genshin耗时超过脚本采用的历史490秒保守分配，但实际900秒门禁均通过；490不是延迟保证，不延长900秒或修改acceptedAt。

NTE先发布时保留Genshin既有JSON，再source-rebind/重新选择Genshin来源；随后Genshin新发布保留NTE新JSON，再source-rebind/重新选择NTE来源。**两次交接只读云，不是又一次部署或下一候选授权**。最终双游戏目录均绑定当前Main：

| Worker | 当前100%活动UUID |
| --- | --- |
| `gachia` Main | `63b9b839-5ad7-4f61-9add-5df5ee336bc4` |
| `gachia-game-genshin` | `347eb5c8-36d5-4f9c-b548-bb19c8617304` |
| `gachia-game-nte` | `c1247d65-734d-42a9-8f6f-16d6ab0a1173` |

最终NTE source-only manifest pin为`47d457114c927348a3dd6e9a36705a683631d9b66213d87fb708720d98041f4a`，source pin为`23b28e592615c201e5f21a781693157e716f5c722b75123db61c7b36365f8358`。不能复用NTE首次成功时的旧Main UUID`8388fe49-f4c3-4954-abea-917540839a14`当最终版本。

## 3. 实测阻塞、修复与失败保留

1. 初次NTE新run `d871b48834f4c8fb-b2ed51b1274d`仅上传非活动NTE版本`0dfa8d09-f1c5-45fc-8e76-0bbe7e62029b`，第一次精确元数据GET为404，停止在部署前。后续只读核对该UUID已200，生产未变。
2. 修复后的全新run `d871b48834f4c8fb-91d281358370`，NTE非活动版本`bcc00953-ce1a-44dd-bc77-1e2ffdddfa46`预览通过，Main非活动版本`3a41076b-2a5d-4d77-a9e6-e1d64a5e48aa`元数据404超过原7秒等待，再次部署前停止；后续只读确认200、生产未变。
3. 两次旧journal/目录完整保留，修复后另建run；复用已批准且尚未上线的同一NTE真实修改，不再制造编辑或重复旧写。最终两个成功run均使用精确代码`710673f0e7a57c0584cbc42e464b9acff13ce43d`。

已提交、推送并安装的工程修复：

- `a47fc7051a1a673736523d1a028724ce6873c9f8`：上传后首次精确元数据404有界等待；现有同步`withVerificationPass`应用于prepare与source输入重验，不跨await/网络/写边界缓存，后续调用重新读。精确CI `41815096311`成功。
- `710673f0e7a57c0584cbc42e464b9acff13ce43d`：首次元数据等待调整为5/10/20/40秒，最多5次同服务/UUID GET及75秒等待；本机`version-visibility.jsonl`留时间/服务/UUID/status/attempt/delay，不留凭证。普通身份检查、二进制HTTP错误、403/503及写操作不重试。精确CI `41823350685`成功。
- 成功批次未生成visibility等待日志，不能宣称75秒分支已由成功实网触发；该分支有回归覆盖。已存在二进制自身传输超时的一次只读重取不变，上传/部署不自动重试。
- 原性能fixture首次因缺少parent失败，补齐后在优化前也通过；不是性能缺陷的红测复现。它覆盖同步去重/后续新鲜读取。真实旧run只读`verifyPrepared`实测19.42秒，不承诺端到端耗时。

CMS首次操作曾因误判draft/formal在写前停止；第二次实际批准已成功，但锁清理404导致脚本退出1，独立认证重读确认成功。后续helper允许锁已移除404并finally注销，Genshin完整退出0；没有因清理错误重复写入。

**本轮共11个唯一Worker版本上传、4个成功部署POST、0恢复部署POST、0写重试。** 其中3上传属于两次停止的非活动尝试；其他8个为两次成功批次各4版本。静态资产上传和官方OAuth续签单列，不混算Worker版本。R31真实partial/显式兼容恢复与R32恢复后再发沿用已封存证据，本轮不重复故障演练。

## 4. 最终运行与验证

- 本机CMS/PostgreSQL healthy/loaded；安全HTTP9/9，匿名用户/内容/媒体拒绝，外部Origin/Host/Sec-Fetch-Site拒绝。1用户、84内容、1媒体；Genshin30draft/hold+1published/eligible，NTE52draft/hold+1published/eligible。最终完整DB摘要`7fb83e21f6a68ea89a08234cb673ffc20a270d2ec7448bd8c2230bd32e044c83`，只读观察前后相同。
- 28工具文件与工作树publisher字节一致，698应用文件验摘要。已安装CMS应用仍R33源码`23c8e3e3bb49884763b34d8e8be619bc4d42c3da`，本轮只换publisher，不把代码HEAD当应用bundle版本。
- 三次本机冷备：`20261104T083515Z-a033ca`、`20261104T132645Z-a43890`、最终`20261104T152116Z-424b09`；备份正常停启CMS，公网不依赖Mac。**最新R2对象仍R29，本轮没有更新异地密文或完成最新备份恢复。**
- 最终公网4路径均200/无set-cookie，两个JSON SHA与各自候选一致；HTML可见新段落、标题、canonical、description、可解析JSON-LD通过。HTML为private/no-cache/no-store，JSON为public,max-age=0,must-revalidate。首次最终采样第4路径TLS连接超时，失败及前三条响应保留；新前缀完整只读复验通过，不覆盖失败、不部署或清缓存。
- 最终控制面10Worker/7服务重验通过；Router、staging及非目标服务保持，正式Git main仍`71a52728be2c9612d0b39be47092b7d85a320ac3`，GitHub production/staging两个部署变量仍false。不是账户级所有Dashboard/token入口均被强制封堵。
- R29–R35七轮封存共1792文件重新验大小/摘要不变，历史证据未改。剩余磁盘空间此前约14GiB，尚未做保留清理；被pin的发布/恢复/来源依赖不可直接删除。

测试结果与来源：完整桌面806/806、其他Node304/304、Python49/49；CMS174/174/typecheck在本轮首个修复阶段本机执行通过，visibility-followup为带`test-provenance.json`的日志复用，不冒称又一次本机CMS运行；两次精确代码CI各自新鲜执行CMS/typecheck、Router/inventory与完整release检查。最终文档命令/链接/差异及精确文档提交CI另记于本目录交付JSON，不把旧代码CI套到新文档提交。

## 5. 原始任务状态与余项

| 阶段 | 当前状态 | 真实剩余 |
| --- | --- | --- |
| P0 | 部分完成 | 全类型字段/ID/URL/依赖/责任与资源使用账本 |
| P1 | 部分完成 | 限定编辑权限/前向回退保护已装；完整UI/并发/密钥生命周期仍未关 |
| P2 | 部分完成 | 全类型及内联结构正式接管、完整内容/媒体账本 |
| P3 | 部分完成 | 全关联类型DTO/生产快照与通用批次 |
| P4 | 部分完成 | 限定双game/Main实发通过；全owner/普通请求releaseKey与缓存协议未完 |
| P5 | 部分完成 | 真实连续/恢复后再发已验；队列/批量/调度/吞吐/告警未完 |
| P6 | 未完成 | 新游戏配置化导航/搜索/SEO与扩展契约 |
| P7 | 部分完成 | 同机/云兼容恢复已验；独立key暂缓、最新异地交付、全旧入口退役未完 |

| 任务 | 当前状态 | 真实剩余/边界 |
| --- | --- | --- |
| T01 | 完成 | 保留状态/历史回归 |
| T02 | 限定本地完成 | 云/全范围归后续任务 |
| T03 | 部分完成 | 全类型DTO/依赖/账本及新媒体权利；准确度不是门槛但不能取消媒体授权 |
| T04 | 部分完成 | 限定真实云连续/双游戏/partial及恢复证据已有；全请求releaseKey、全owner/类型未完 |
| T05 | 部分完成 | 本机Node/PG已运行；安全/密钥/保留完整生命周期未完 |
| T06 | 部分完成 | 限定顺序双owner/显式恢复已验；通用激活协调器未交付 |
| T07 | 部分完成 | 批准/撤回资格与隐式回退拒绝已装；完整UI/并发/网站撤回与reset-intent未完 |
| T08 | 部分完成 | 独立正常/双游戏持续实发已验；队列/吞吐/受控批量未完 |
| T09 | 未完成 | 新游戏配置/导航/搜索/SEO/扩展 |
| T10 | 部分完成 | 两游戏既有指南文字链接入；全16scope最终同步/停写/权威交接未完 |
| T11 | 部分完成 | 本机应用与云兼容恢复已验；独立key暂缓、最新异地恢复包/旧入口退役未完 |
| T12 | 部分完成 | 代码/安装/CI及来源接续已有；首次无可信来源/外部UUID/账户级仅本机约束未完 |

releaseKey绑定候选/字节/UUID/回执，不等于每个普通应用请求全程注入。game与Main仍顺序切流，不是原子ReleaseMap；partial必须停止、只读对账、显式恢复。新增/删除、媒体、固定metadata和其他类型不在当前六字段发布能力内。CMS hold/撤回不等于网站删除；原始T04及全项目不能据此关闭。

## 6. 下一步与证据入口

当前上线目标已达标，下一步按业务方向进入**真实内容批次**，不要再重复同一验收。优先在既有两游戏指南范围运营，代理先写CMS再发布；若要新增/删除或新类型，另开对应能力切片。独立运维后续是最新异地备份、磁盘保留治理、2026-11-16前复核1项low依赖；C05b保持用户暂缓，不要求现在提供介质。

本机原始证据（不提交真实内容快照/凭据/原始HTTP到Git）：

- `visibility-attempt/{nte,genshin}/`：真实内容意图/草稿批准重读、完整差异、四版本云预览/renewal/推广、公网/source-advance及双向Main交接。
- `publication-summary.json`：两次历史接受结果、准确pin/版本、11上传/4部署计数；最终版本以`cloud-final-check.json`和`project-final.json`为准。
- `nte/`、`fresh-attempt/`：两次仅非活动上传的停止与只读对账；不得重放。
- `blocker-fix/`、`visibility-followup/`：两次代码提交/精确CI/测试来源/安装及回退备份回执。
- `local-final.json`、`backup-after-publications.log`：最终本机安全/完整性/DB与冷备。
- `final-observation.log`及`public-final-*`：保留首次TLS失败；`final-observation-recheck.json`/`public-final-recheck-*`：完整最终成功复验、旧封存摘要及Git部署开关。
- `delivery.json`、`github-final-result.json`、`evidence-index.json`：最终文档交付/CI与全目录摘要封存；索引排除自身，封存后不修改文件。历史R29–R35索引不重写。
