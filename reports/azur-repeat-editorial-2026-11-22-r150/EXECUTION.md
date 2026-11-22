# R150 蓝色星原第二次真实 CMS 单 Worker 发布完成

2026-11-22：蓝色星原已正式更新到 `f6fb496a-6127-4a1e-89b8-6ef5148087f8`，100% 流量，deployment `8af824ba-0fe9-4e8e-a696-0b74b6bbc88d`。仅上传两个蓝色星原版本并正式部署一次；其余生产服务和 Router 保持。兼容恢复 `12b268e7-ae0f-4c0d-ad7a-5a156c6e5232` 已完成云预览和模块校验，未实际回滚。

真实 CMS ID 295，既有攻略 `kibo-battle-and-ecology`，仅英文正文把 `a fast-updatable Kibo record` 改为 `a Kibo record that is easy to update`。保留 R122 的 `Kibo connects` 首句、其他语言和其他 2,965 条记录。一次草稿、一次审核；真实导入 O 保留，已核验 A 登记为受控编辑基线，事务更新 1 条、重复 0 写入、只读验证通过。SQLite 和非超级用户 PostgreSQL 事务测试通过。

精确执行源码 `b17205887b15085cde6514685d975a9991ac74ae`，完整 CI [44988972036](https://github.com/aieasygames-alt/gachia/actions/runs/44988972036)通过。候选与兼容恢复各 336 项本机验收，固定发布器完成两者云预览及正式切流后的公网验收；另外 778 项聚合/公开 JSON/搜索、三语×桌面/手机×JS开关共12种浏览器场景通过。现有蓝色星原攻略正文没有独立 raw-guides JSON 接口，本次核对既有 JSON、搜索和 Main 元数据保持正确，没有新增重复副本。

115 份来源只有 `apps/game-azur-promilia/lib/data.ts` 变化，其他114份保持；完整五 owner来源已接续，R152最终安装版真实读取器已重开新来源。CMS最终2,966条draft/published均核验，发布过程没有额外内容写入。胡桃、异环已发布修改及既有攻略增量继承前态。

权威交付：[delivery.json](./delivery.json)。下一批使用 [最终来源索引](./published-sources/source-index.json)，pin `4cb01a5f0b7aa2f7ac0519f00bdb217528cfdd8033fa859016582bfdae2fcbb6`；CMS从 [cms-after-production.json.gz](./cms-after-production.json.gz)接续，pin `7ba95de70d2af86323885e9282879fee2fc6803e1d0e0b27d97c88a866b01114`。不得重放本批草稿、审核、同步、上传或部署。

两次早期本地阻塞均在云写入前处理：import O/A编辑冲突通过受控baseline事务解决；历史工具误用当前锁文件通过按封存回执定位原工作目录解决。完整锁、工具字节与历史证据校验保留。正式发布后的来源接续因共用预览地址白名单遗漏Azur被拒绝；3717752补齐Azur/Lvmeng并经独立完整CI验证后，只读接续成功，没有重发内容。旧失败记录保留，见 [OPERATIONS.md](./OPERATIONS.md)。最终使用 prepare-03 / prepared-final.json / request-final.json / ci-executor.json，旧文件仅作历史。

后续常驻CMS补丁安装归入 [R152](../cms-history-topology-2026-11-22-r152/EXECUTION.md)，没有再次发布内容。
