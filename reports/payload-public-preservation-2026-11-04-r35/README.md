# R35: 后续发布隐式回退保护

日期：2026-11-04。延续[R34就绪审计](../payload-readiness-audit-2026-11-04-r34/README.md)的最短顺序，先修F1，再检查真实NTE/独立Genshin编辑及独立密钥条件。仅此Mac运行CMS，公众多Worker架构、每次只写game/Main、900秒门禁及既有六个指南文字字段范围不变。

## 修复契约

以最初Git/导入O、绑定当前部署UUID的公开A、冻结候选B逐字段比较。六个title/content字段中，只要A→B发生变化而B恰好等于O，就拒绝正式前向发布，包括另一条指南更新和同一指南另一字段更新时的隐式重置。正常O→A→B、保留A后修改其他指南、非O空串更新允许；无内容变化仍拒绝。

- `desktop-published-baseline.mjs`增加纯函数门禁及磁盘校验，绑定原始/公开字节、旧部署UUID、候选SHA与真实非preview计划。
- `desktop-evidence-preparation.mjs`在本地证据准备阶段提前拒绝。
- `desktop-promotion-transport.mjs`在正常及renewed正式推广的锁内核验回调中执行，并沿用每次异步/写入边界重新核验机制；失败不创建部署写入intent。
- 历史来源和手动恢复reader不套用前向策略，放弃不安全B时仍可恢复可信A。没有改写旧manifest、已封存run或放宽恢复来源。

这是**最小fail-closed保护，不是导出器自动保留A，也不是完整显式发布意图协议**。原始导出/inspect仍可生成用于诊断的不安全候选，但不得进入正式推广。刻意将字段恢复为精确O也会被拒绝；显式reset-intent工作流尚未实现，不能手改pin、添加绕过开关或混入未批准草稿。hold/撤回仍不等于网站删除。

## 本地回归与输入检查

- 定向回归85/85；新增15项回归，覆盖六字段、missing/null/空串、同记录不同字段、两游戏准备门禁、UUID/SHA绑定、写前候选篡改及恢复reader兼容性。
- 完整发布回归：桌面799/799、其余Node304/304、Python49/49；CMS174/174及typecheck通过。两个重测试集依次运行，未放宽超时或断言。
- 保留首次测试优先缺少export的失败日志`baseline-red.log`，以及新测试fixture在transport克隆后才补plan导致的失败`focused-green.log`；修正测试构造后`focused-final.log`全通过，不将测试fixture失误冒称线上缺陷。
- `local-before.json`：698应用文件验摘要，CMS/PG健康且loaded，9安全HTTP通过。DB摘要仍为`e13cf0505683bb76cb30b8283a3a5bbcbd3c688e56eceff3d2d5cc671bd46521`；84条中原神1条published/eligible、83条draft/hold，与R34相同。**没有新的真实NTE或独立Genshin编辑**，不造内容、不清hold、不重发R32候选。

## 交付状态

代码、本地完整回归已完成；精确提交CI、仅三模块本机安装与安装版fixture验证待执行，完成后在本节追加实际结果。安装不需要替换CMS应用、重启服务、迁移数据库或写入内容。旧三模块将私有备份，可失败回退；其余25个工具闭包文件须保持一致。

真实NTE发布/反向Main交接、独立Genshin正常下一发布仍待真实编辑输入；C05b仍须真实独立保管位置，不把同盘目录或R2密文当独立密钥验收。C01/C02/C05a保持关闭，不用本轮测试替代云验收。
