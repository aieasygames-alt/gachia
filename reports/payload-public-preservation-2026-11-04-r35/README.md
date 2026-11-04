# R35: 后续发布隐式回退保护

日期：2026-11-04。延续[R34就绪审计](../payload-readiness-audit-2026-11-04-r34/README.md)的最短顺序，先修F1，再检查真实NTE/独立Genshin编辑及独立密钥条件。仅此Mac运行CMS，公众多Worker架构、每次只写game/Main、900秒门禁及既有六个指南文字字段范围不变。

## 修复契约

以最初Git/导入O、绑定当前部署UUID的公开A、冻结候选B逐字段比较。六个title/content字段中，只要A→B发生变化而B恰好等于O，就拒绝正式前向发布，包括另一条指南更新和同一指南另一字段更新时的隐式重置。正常O→A→B、保留A后修改其他指南、非O空串更新允许；无内容变化仍拒绝。

- `desktop-published-baseline.mjs`增加纯函数门禁及磁盘校验，绑定原始/公开字节、旧部署UUID、候选SHA与真实非preview计划。
- `desktop-evidence-preparation.mjs`在本地证据准备阶段提前拒绝。
- `desktop-promotion-transport.mjs`在正常及renewed正式推广的锁内核验回调中执行，并沿用写前与验收边界重新核验机制；门禁失败后不继续创建部署写入intent。
- 历史来源和手动恢复reader不套用前向策略，放弃不安全B时仍可恢复可信A。没有改写旧manifest、已封存run或放宽恢复来源。

这是**最小fail-closed保护，不是导出器自动保留A，也不是完整显式发布意图协议**。原始导出/inspect仍可生成用于诊断的不安全候选，但不得进入正式推广。刻意将字段恢复为精确O也会被拒绝；显式reset-intent工作流尚未实现，不能手改pin、添加绕过开关或混入未批准草稿。hold/撤回仍不等于网站删除。

## 本地回归与输入检查

- 定向回归85/85；新增15项回归，覆盖六字段、missing/null/空串、同记录不同字段、两游戏准备门禁、UUID/SHA绑定、写前候选篡改及恢复reader兼容性。
- 完整发布回归：桌面799/799、其余Node304/304、Python49/49；CMS174/174及typecheck通过。两个重测试集依次运行，未放宽超时或断言。
- 保留首次测试优先缺少export的失败日志`baseline-red.log`，以及新测试fixture在transport克隆后才补plan导致的失败`focused-green.log`；修正测试构造后`focused-final.log`全通过，不将测试fixture失误冒称线上缺陷。
- `local-before.json`：698应用文件验摘要，CMS/PG健康且loaded，9安全HTTP通过。DB摘要仍为`e13cf0505683bb76cb30b8283a3a5bbcbd3c688e56eceff3d2d5cc671bd46521`；84条中原神1条published/eligible、83条draft/hold，与R34相同。**没有新的真实NTE或独立Genshin编辑**，不造内容、不清hold、不重发R32候选。

## 精确CI与安装结果

- 工程提交`e9c50f4dcb82acca54f38c02186121fc2565a647`已推送维护分支，精确[Payload Verification Only CI](https://github.com/aieasygames-alt/gachia/actions/runs/41793688677)成功（Linux Node22.23.4，5分52秒）；该workflow不持部署凭证、只验证，不部署公众Worker。见`github-code-result.json`。
- 新建本轮`install-tested.py`，仅在精确提交CI通过、tracked干净、维护锁独占、无活动run锁、数据库与应用摘要一致时安装。先在私有目录保留原三模块，导入完整25模块闭包，再原子替换三文件；安装异常会恢复原三文件。没有执行历史安装/发布/封存脚本。
- `installation.json`实证安装成功：全28工具闭包及698应用文件一致；旧三模块在本机私有`publisher-upgrades/public-preservation-*`中保留，不重写manager、两TS helper或CMS应用，不重启CMS/PG，不迁移/写DB。
- `installed-export-check.json`使用**实际已安装应用导出函数与新安装publisher门禁**，隔离fixture覆盖Genshin/NTE各hold、撤回、正常后续更新，并断言无eligible拒绝。六组结果通过；不是对真实DB造记录或云E2E采样。
- `local-after-install.json`再次确认CMS/PG healthy/loaded、9安全HTTP、原DB摘要不变、publisher与当前源码零不匹配。Router35/35、inventory/生成配置/部署配置/类型契约通过，见`worker-contracts.log`。
- `delivery-observation.json`保存三个公网GET的body/headers：原神指南H1/title/description/canonical/JSON-LD存在，H1为R32已发布标题，两游戏JSON SHA与已接受值相同。没有新NTE发布或全URL/全语言/全请求releaseKey验收。本轮未重新build公众/CMS应用、重演恢复或查询Cloudflare控制面，OAuth未刷新。
- Git生产main仍`71a52728be2c9612d0b39be47092b7d85a320ac3`，两个GitHub自动部署开关仍false。R29–R34六份封存索引及其索引文件全部验摘要不变；R34索引仍为`14df643f2272e6b9a1f593a7e1ddf79b10aa7277b0b0e35b19b7256b211322e4`。不修改历史报告来补新验收。

## 四项顺序执行后的状态

| 顺序 | 结果 | 下一实际输入/动作 |
| --- | --- | --- |
| 1 F1最小前向保护 | **代码/回归/精确CI/安装版验证完成** | 不重复建设，不夸大为自动保留A或完整显式重置协议 |
| 2 真实NTE发布与反向Main交接 | **检查完成，真实验收未执行** | NTE53条仍draft/hold，DB摘要与R34相同，无真实待发编辑；有实际希望公开的既有指南title/body修改后，另建新run并走完整四版本/900秒/双owner/公网/source-advance及Genshin反向交接 |
| 3 独立Genshin正常连续发布 | **检查完成，真实验收未执行** | 只有R32已接受的published记录，没有独立新修改；保留NTE新公开状态后另建正常下一发布，不复用已成功releaseKey |
| 4 独立密钥保管/取回 | **检查完成，C05b未关闭** | `backup-state.json`确认同机32字节key存在且0600，未读取key字节；settings未配置独立保管位置，唯一非系统挂载卷Antigravity只读，不能作为目的地。真实可写独立介质/安全托管具备后复制、取回、认证解密；不擅自选iCloud或把key与密文同桶 |

没有新建真实发布run、写内容/hold/媒体、上传/部署Worker、写R2或刷新凭证。最新已验证异地对象仍R29，R33冷备及本轮publisher回退副本仍属本机，不夸大成当前整机丢失恢复。独立key不是要求第二台Mac运行；实际目的地缺失也不否认原神文字已能受监督上线。

C01/C02/C05a保持关闭，C03/C04/C05b仍待上述实际输入。P0–P7/T01–T12整体状态沿用R34，P1/P5与T04/T07/T08仅增加F1最小门禁已交付，仍部分完成。全类型、队列、全站ReleaseMap、完整网站撤回、事实校对和翻译不在本轮扩建；不让报告循环代替下一真实发布。五份维护文档/当前任务表已更新，修改后手册37/37、121个本地文档链接与`git diff --check`通过。最终交付状态和索引见本目录对应日志/JSON；原始运行证据仅本机保留，不提交密钥或私有数据库内容。本轮安装/取证完成后不重跑一次性安装或历史执行脚本。
