# R29 真实发布推进与实机阻塞

日期：2026-11-03。目标是关闭剩余C03/C04/C05，不以增加工具/测试数替代实际上线。本轮确实执行CMS编辑、真实应用构建及一次非活动版本上传，但**三个工作包仍未全部关闭，首次真实编辑尚未公网生效**。当前执行见[有限V1计划](../../plans/payload-v1-completion-2026-11-03.md)、[任务表](../../plans/project-task-status-current.md)、[手册](../../docs/payload-operator-runbook.md)。

## 1. C03 实际推进与停止点

- 先冷备并恢复本机服务。以管理员身份将既有Genshin `quick-start-guide` 的中文标题从“原神快速上手指南”改为“原神快速上手指南：基础操作、元素反应与资源规划”，先保存draft再显式published/hold=false。改善阅读定位，不加玩法事实、媒体或诊断内容；正文/sourceRecord/身份/URL/其他语言及其他83记录不改。没有批量清hold或修改NTE。
- 正式非preview导出releaseKey为`61cf1ede43df373693eea8cb2b83641ef3791876953ab8024c0233873de0bef6`，候选SHA为`9e49bee84613e11cc261204eb83454ee1848809af094474fd8eccedcc550518b`。实际game/Main双构建、临时Worker预览、547条旧资源实际HTTP、公开A、本地兼容恢复、候选/恢复云封存及其校验全部通过；这些不是成功公网推广。
- 使用安装版受控流程上传game非活动版本`5dfd0437-01af-45d6-b416-c1ff9a141e1d`成功，随后旧`/settings`比较因`annotations.workers/message`被上传移除而拒绝。Main未上传，候选/恢复精确云HTTP验收未开始，没有推广或恢复。完整journal保留，没有自动重试/回滚/删除或改写时间。
- 修复后只读对账得到`baseline_active`：Genshin仍为`c0dba6f4-878a-467e-91e9-f32508e59e82`，Main仍为`3efd4103-7156-484b-86d8-a28853a668c8`，均100%。非活动版本不是当前公众版本。
- 新只读prepare先遇到OAuth401；用既有Wrangler刷新认证后，新目录重取证，不重放写操作。随后当前来源选择发现：请求旧UUID的`content/v2?version=...`返回模块SHA `4e9f318a5e2f3da8d6030b4218a4a4973d3905a7a6d51212c25e1cecface3da3`，即刚上传候选，而已登记旧来源为`62a8007ea8e25353fc0016767ff6741cd343186522651b70842b829a82f2f0c7`。活动部署和旧版本元数据均未变，因此不能把它误读成生产已切换。
- 保存了本账户实际GET响应：版本元数据200；版本尾部`/content`返回同样的元数据JSON，不是模块；content接口的UUID、version_id、版本number/etag选择器及script查询仍返回最新模块或拒绝。这是本账户当前接口的实测边界，不泛称所有Cloudflare账户/接口都不支持历史内容。新prepare在来源选择即停止，没有新run/build/upload，不绕过字节门禁。

**C03未完成：** 首次切流/公网验收、source-advance、第二次发布、真实partial failure/兼容恢复/source-recover/再发。当前最高优先级是可靠的精确版本模块取证或经独立论证的新身份绑定协议，不能把本地runtime/普通别名/ETag检查称为已经完成的精确云字节下载，也不能用测试替代此缺口。

## 2. 本轮修复的两个真实阻塞

1. **版本message不是运行拓扑。** 仅从settings比较中移除`workers/message`描述字符串，原值仍存证；未知annotations、triggered_by、observability、兼容配置、bindings、路由、服务集与部署UUID仍严格拒绝漂移。用实际失败场景补回归，没有关闭拓扑保护。
2. **Main保留另一游戏的已发布A。** 原prepare只覆盖当前game的package/public两文件，后续NTE构建会携带Git中的旧Genshin O，可能回退其公开JSON。新生产prepare先从完整来源链选当前Main，核对另一游戏的真实公网JSON与可信树字节，冻结其package/public两个输入；plan绑定正文/来源pin、commit及Main UUID。build、retain及封存重验；候选和兼容恢复增加独立哈希的另一游戏引用，并纳入精确云/公网验收。public路由只额外接受带明确Main版本绑定的另一个已知游戏指南，不开放任意data路径。rebind验证并复用该已封存引用，不重复插入。

双游戏隔离成功/拒绝/篡改回归通过，代码已安装。新prepare的实际网络流程因上述精确模块读取拒绝，**没有完成修复后新双构建或真实NTE发布**；C04工程缺陷关闭不等于C04真实连续性验收关闭。

## 3. C05 更新备份，不冒充跨机恢复

本轮编辑后重新冷备，打包当前DB/私有媒体/settings、冻结源码/锁/测试、已安装发布器与导出状态；36文件，明文压缩包51,649,292字节。AES-GCM密文51,649,337字节，以新随机对象写入专用私有R2桶，实际下载验密文SHA并认证解密，明文SHA匹配。上传前后隐私检查通过，无公开域名或网站binding变化。原始无密钥回执仅本机保留，不入Git。

这解决“旧异地备份不含本轮编辑/工具”的问题，**不关闭C05**：新旧key均仅在本机；当前外部挂载卷是只读安装DMG，未配置第二台Mac执行上下文。不声称用户没有其他设备，也没有将key放入R2/聊天/报告。没有重复同机PG恢复来凑跨机完成；实际独立密钥取回、第二物理Mac恢复PG/媒体并启动/登录CMS仍须真实环境。恢复步骤见[异地恢复手册](../../docs/payload-offsite-recovery.md)。

## 4. 验证与交付边界

| 项目 | 本轮结果 |
| --- | --- |
| 发布工具 | 完整桌面679/679、既有Node304/304、Python49/49通过；新增24项回归含API忽略历史选择器时零推广写入。云控制面回归模拟，不冒称实际云验收 |
| CMS | 165/165、next typegen/typecheck通过；没有改CMS运行bundle |
| 安装 | 24publisher模块+manager+2未变TS helper，共27文件备份安装、导入/参数smoke及摘要核对通过；安装本身不重启CMS |
| 本地 | CMS/PG健康且loaded，安全HTTP9/9；83draft/hold、1eligible published。DB因实际编辑改变，不沿用旧“摘要不变”结论；两次冷备短暂停启后恢复 |
| 多Worker | 实际观察10Worker、保护7服务；活动部署/操作设置/Router/staging无变，仅一个非活动Genshin版本和一份新私有R2备份；无生产推广 |
| Git/CI | 产品修复提交`bc497f51bfeebb351966dc13aadfbcec0af17555`精确只验证CI `41587080090`成功。最终状态/补充拒绝回归提交CI另存本机delivery，不用旧CI冒充新提交 |

本轮未重跑public parity、媒体runtime全套或依赖audit；未改公众应用源码/媒体，实际双owner构建属于上述首条候选的冻结旧提交。既有1low依赖风险仍按11月16日前复核，不声称清零。原始全类型/全scope/全请求releaseKey/权威移交/退役等P/T等级不提升。

Git只跟踪本README和安全汇总，不跟踪正文/控制面原始返回、数据库、密钥、私有路径、发布run或日志。最终非循环证据索引/交付身份在本机生成，历史R28索引不修改。ambient脏checkout不动，main保持`71a52728be2c9612d0b39be47092b7d85a320ac3`，两个GitHub云部署开关仍false。网站继续完全由Cloudflare服务，不依赖Mac在线。
