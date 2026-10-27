# 移动端导航修复只读恢复验收

日期：北京时间 2026-10-27。结论：**测试修正已合入并通过 Linux CI；当前已部署制品通过独立、可信、包含新增绘制门禁的只读恢复验收。移动端导航透底与英文卡片溢出两项 P2 完成收口。** 此结论限定于记录的测试与截图范围，不是全站、所有浏览器或全球节点长期稳定性证明。

原生产发布 [40348527117](https://github.com/aieasygames-alt/gachia/actions/runs/40348527117) 始终保留 `failure`。本次新运行 [40434584403](https://github.com/aieasygames-alt/gachia/actions/runs/40434584403) 为 `success`，只触发一次，没有重跑发布 job、构建新候选、上传/推广 Worker、回滚、迁移或清缓存。

## 源码与门禁

- 生产源码仍是 `12c1c6b843f4972fcd46132bdd7363f76dcbe0b3`。当前 Main 100% UUID `3efd4103-7156-484b-86d8-a28853a668c8`，deployment `6300eb50-e8ed-491b-b9cd-26a59ad11d36`，与恢复前完全相同。
- 测试修正 `12218b7` 与恢复门禁提交 `6d2e32db5f9a6eb13d1dbfd477c76de5ce69bf94` 已快进合入 main。相对生产源码，`apps/`、`packages/`、锁文件及恢复策略要求的运行时/内容契约均无变化；只修改测试、恢复验证与证据。
- main push CI [40432069788](https://github.com/aieasygames-alt/gachia/actions/runs/40432069788) 成功：build 成功，浏览器 58 通过、8 跳过；deploy-staging/deploy 因 push 事件跳过，不算部署成功或生产验收。
- 恢复脚本追加实际公网 42 项 sticky header 测试，固定 `https://gachia.com`、2 workers、0 retries。要求所有结果 passed、无 runner/case errors、无跳过/意外/重试、两种 Chromium 配置各 21 项，才允许签发回执；保存测试摘要与测试源码 SHA-256，失败时保留日志和截图。
- 回执消费策略兼容历史不含该门禁的发布，但包含新绘制门禁的发布必须提供对应完整验证，不能用旧格式回执洗绿。本地 Node 304 + Python 31 发布合约测试通过，新增失败/跳过/重试/缺漏/重复及旧回执负向测试通过。

## 精确制品与来源

| 对象 | ID / SHA-256 |
|---|---|
| 原已部署 Worker artifact | `12662818947`，来源运行 `40348527117` |
| Worker ZIP | `cb1192aeda6b45f49a9af4fdcd8f931e93a4113e6098d5874b4cd79c1ec5a00b` |
| 内层 sealed tar | `abbebb44a39dd7bf3f438f9b7ba4555e233eba365a017bf8e3c97ad5b5715b2c` |
| 新恢复回执 ZIP | `12704725102`，`d0b98ac86fd7a4c2fc97f7b8237bab39827781575168c8eea47a72810748fa76` |
| 新恢复证据 ZIP | `12703424609`，`a3b046fd768e94c24bd70609edcb659051dd6760fad40dcadee73a553f25b4ac` |
| 新验证源码 | `6d2e32db5f9a6eb13d1dbfd477c76de5ce69bf94` |
| 实际绘制测试源码 SHA-256 | `6454f7e7d38e9d7691dee792e2671dd76b479d3a36ff232ab794f81bf469cc65` |

执行前重新 fetch、确认干净源码与 CI SHA 一致，核对七个 deployment、制品未过期、精确元数据/摘要及原成功上传日志，没有并发运行。恢复在全新 Actions checkout 中下载原 ZIP、实际核验 ZIP 与 tar 摘要并恢复原制品；不复用 CI 新构建或本机 `.open-next`。原 Worker 制品过期时间为 `2026-11-25T15:38:57Z`，仅是本次执行前观测，不保证未来仍可用。

本机已下载两个新恢复 ZIP，分别计算实际摘要并与 GitHub 元数据核对。只读取有界 JSON/文本，不执行归档代码；以项目实际 `verifyRecoveryReceipt` 消费策略重新验证可信 main 工作流、成功 job、源失败发布的成功 build/staging/部署步骤、当前 UUID、制品链和新绘制门禁。回执与证据归档中的 receipt、paint summary、acceptance/XML 摘要逐项一致。

## 实际恢复结果

| 范围 | 结果 |
|---|---|
| 基础 Worker HTTP / 运行时浏览器 | 32 HTTP、18 browser 通过；运行时错误、同源失败 JS/CSS、账号请求均为 0 |
| 受管内容 | 23 HTTP、171 fallback HTTP、7 JSON、3 search、520 browser 通过 |
| 受控拒绝 / 旧资源抽样 | 1 未认证 IndexNow 拒绝、12 旧资源字节抽样通过 |
| 新 Header 绘制与返回/宽字体矩阵 | **42/42，0 失败、0 跳过、0 flaky、0 重试** |
| XML 前后完整图谱 | 各 6 文档、6653 唯一 URL，Main 与恢复的 sealed artifact 一致；171 fallback 缺漏为 0，前后 owner 集合一致 |
| 全部封存静态资源 | **441 文件、11,240,745 bytes**；逐个公网 GET、长度和 SHA-256 全部匹配，重定向也拒绝 |
| 最后 HI3 阅读探针 | 中英日列表及三详情，12 条 200 |
| 控制面 | 七服务 deployment、bindings、zone routes、站点 domains 前后深比较完全一致，未读取 secret 值 |
| 本机另开公网抽查 | 15/15 基础 GET、19/19 owner、JS/CSS、sitemap，无失败 |

441 个为本次恢复制品的全部静态文件，不等同于上轮保留的 437 个旧文件；不把两种统计混算。520 内容浏览器与 42 绘制场景也是不同测试范围，不当作唯一页面数量。绘制摘要完整列出两配置、五宽度、中英日及指定脚本模式；底层采用 Chromium 模拟，不冒称 Safari/真实 iPhone 验收。

前后快照在只读恢复内部覆盖 Main、Main staging、四游戏、Router 的部署和绑定，以及 zone routes/相关 domains；本机结束后再次读取七个 deployment，与执行前一致。此结论只覆盖查询到的字段及时间窗口，不推广为所有 Cloudflare 账户设置永久不变。secret 仅保留名称，不读取值。

上轮独立生产截图、42 项公网测试、补充卡片检查与负向验证仍见 `reports/mobile-header-release-2026-10-26/README.md`；本轮不把旧截图伪装为重新拍摄。本轮新增的可信恢复门禁和制品字节检查与旧记录独立保存。

## 收口与限制

移动端导航透底、英文武器卡片溢出、测试隔离误报及缺少新绘制恢复门禁均已完成本批收口，无需为这些问题再发布或再次恢复。原失败运行和各次失败截图/断言仍保留；恢复回执是新增证明，不抹除历史。

账号删除继续取消、登录仍关闭。恢复复用的现有验收含匿名停用账号/IndexNow 拒绝探针，不执行真实账号操作、用户分享读取、地图 R2 业务命中/写入、数据库迁移或缓存清除。真实分享过期/字段白名单和地图缓存生产数据端到端仍未覆盖。编码 NUL/点段的公网边界契约差异仍未解决，也未在本轮额外探测。

Actions 剩余额度依旧不可观测；production environment 仍无额外保护规则，本轮未配置平台保护、刷新权限或扩大 scope。S3–S8、游戏/Router 通用执行器、审批/预算等独立长期事项没有因此交付。第三方分析服务在绘制测试中主动阻止，不属于已验证服务。

机器可读、去操作者信息的摘要见 `result.json`；原始 Actions 日志、控制面返回、两个已校验 ZIP 和命令记录在 `.release-records/mobile-header-recovery-2026-10-27/`。后续仅证据收尾提交使用 `[skip ci]`，不触发新 CI、恢复或发布。
