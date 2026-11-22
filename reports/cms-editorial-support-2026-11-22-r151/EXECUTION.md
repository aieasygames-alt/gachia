# R151 常驻 CMS 持续编辑与原神特殊技能支持

已安装精确源码 `a3d4f220f4cac90953a5460195fc4919989dae76`，[完整 CI 44985253024](https://github.com/aieasygames-alt/gachia/actions/runs/44985253024)成功，七项发布门禁均通过。标准 Next 构建在 CI 等待期间完成；安装前重新核对精确提交、全部依赖与构建输出摘要，复用相同构建结果。Next 16.4.6 / Payload 3.92.1 / React 19.2.6 及锁文件保持。

新应用包含 804 个应用文件、358 个跨目录文件与 43,788 项依赖清单。安装路径为 `/Users/robert/Library/Application Support/GachiaCMS/releases/20261122T045051Z-cms-editorial-support-r151-a3d4f220/services/content-cms`。准备后和安装后的真实读取器分别重开 R148，115 来源、五 owner、allOwnersCurrent=true。完整隔离 PostgreSQL/HTTP 15 组、常驻 HTTP、冷备实际恢复及新→旧 R149→新应用往返切换通过。

原神 `skills.passive3` 和 `skills.specialJump` 的既有 `name`、`description` 及对应 `En` 字段已纳入文本合同。实际发布 A 中的玛拉妮 passive3、欧洛伦 passive3/specialJump 共 12 个既有字段均被安装版识别；三项英文说明分别完成候选及精确恢复验算，英文/日文消费者映射正确。中文、双语字段与数值/媒体/成员拒绝规则由相关回归覆盖。本批未写原神 CMS 内容，未发布原神 Worker。

蓝色星原现有英文攻略支持多次编辑，并补齐只读来源接续。若真实导入 O 早于当前发布 A，安装版受控事务可登记已核验的编辑基线，同时保留真实 O、已审核 B、ID、状态和其他记录。严格使用真实 `inline-guides` 类型；普通编辑不能伪造基线，锁与前态漂移会拒绝，失败可事务回滚，重复执行零写入。该事务及后续内容发布归入 R150。

安装前后 2,966 条内容的 draft/published、43 表、序列与媒体全部保持；六个生产和四个 staging 的部署与配置保持。**安装阶段 0 内容/审核写入、0 schema 迁移、0 Worker 上传、0 正式部署。** 见 [delivery.json](./delivery.json)。恢复演练对应 R150 编辑基线同步前的精确状态；之后接续新增来源应使用本次支持相应合同的 CMS。

R150已完成正式发布。来源重开时发现共用预览地址白名单遗漏Azur，R151不具备读取最终来源的完整资格；未篡改其封存安装。R152最终补丁安装已修复该缺陷，实际重开115来源、五owner、allOwnersCurrent=true。R151保留为应用恢复版本，其R148读取及上述特殊技能资格仍有效。
