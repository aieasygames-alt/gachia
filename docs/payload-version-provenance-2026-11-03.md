# Payload 精确版本取证收敛方案

更新：2026-11-04，R32。状态：**上传字节回执协议已真实用于四版本云验收、恢复后另建run成功正式发布/public acceptance/source-advance，以及NTE共享Main只读交接**。当前交付见[R32](../reports/payload-promotion-critical-path-2026-11-04-r32/README.md)，R31失败/显式恢复历史见[R31](../reports/payload-version-provenance-2026-11-03-r31/README.md)。不把工程通过替代实际公网验收，不重放R29/R31失败run，不声称NTE已正式发布。

## 已确认的边界

- R29活动Genshin UUID仍是`c0dba6f4-878a-467e-91e9-f32508e59e82`，非活动上传为`5dfd0437-01af-45d6-b416-c1ff9a141e1d`。旧UUID元数据与活动部署不是最新代码的证明。
- 请求旧UUID的`content/v2?version=...`实际返回新上传模块。R30按公开服务环境路径GET `services/<game>/environments/production/content/v2`也返回同一新模块SHA，不是活动旧代码。不要通过改路径或API200绕过字节拒绝。
- 当前Cloudflare TypeScript SDK的content.get仅公开无版本参数的`content/v2`，versions.get返回版本元数据。旧Wrangler实现里的查询字符串不能替代本账户实测语义，也不能据此宣称所有Cloudflare账户都不支持历史代码。
- Cloudflare版本文档将version定义为包含code/assets/bindings/compatibility的状态快照，UUID用于标识版本。`resources.script.etag`是供应商的script内容标识；它**不等于**本流程单一`worker.js`的SHA256，不能互换。

参考：[版本与部署](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/)、[SDK内容读取](https://github.com/cloudflare/cloudflare-typescript/blob/main/src/resources/workers/scripts/content.ts)、[SDK版本读取](https://github.com/cloudflare/cloudflare-typescript/blob/main/src/resources/workers/scripts/versions.ts)。本轮保存所读源码/页面和实际响应，不以浮动main链接代替本地证据。

## 最短工程路径，不再穷举接口

如果不能证明一个受支持的历史代码端点，应显式把协议改为“上传时字节取证 + 后续不可变版本回执重验”，而不是把本地缓存叫作新鲜云下载。落地必须一次覆盖准备、候选/恢复上传、推广、续验、人工恢复和来源接续；只修source-select不够，因为上传恢复版本后，旧候选同样不再是latest。

1. **上传时建立独立绑定。** 封存实际出站multipart和模块SHA；绑定上传响应UUID。立刻读取该UUID的元数据、实际内容响应正文和HTTP ETag，再读取元数据确认未变。HTTP ETag须与该UUID的script ETag相符，单模块字节SHA须与封存代码相符；任何缺失、重定向、额外module、变化或身份不符都停止。完整回执以外部pin进入原有journal/preview证据链，不能只存一个自称正确的UUID或可重新计算的本地hash。
2. **后续重验明确标记归档来源。** 只允许已经完成第1步、且仍在可信封存链内的归档。新鲜读取精确UUID元数据，与原回执中的UUID/script ETag/完整运行配置核对；重验归档/模块/上传form哈希、精确UUID预览HTTP和拓扑。结果标为“归档字节 + 新鲜版本身份/配置重验”，不得标为“新鲜历史代码下载”。不能仅看到相同ETag就接受任意本地runtime。
3. **旧来源显式交接，不能自动补造。** 当前三个历史生产UUID并非由新回执协议上传。只能从现有已pin且验证通过的原始capture/历史制品/来源树取得原有UUID、script ETag、模块字节与实际HTTP绑定，逐项核对独立证据；不得拿今天返回的latest或今天新写的ETag映射补造历史关联。原证据不足的owner继续停止，不能设`trustLocal`、伪造GitHub artifact或默默降级。
4. **必要拒绝回归。** API忽略选择器、响应ETag错/缺失、ETag与模块SHA被混同、同UUID元数据漂移、归档改写/重新pin、candidate/recovery互换、另一游戏/Main互换、未知外部UUID、partial/torn journal、回执过期与四版本任一缺证据，均须在推广POST前拒绝。另验真实先上传候选再上传恢复，旧候选归档仍只指向自己的UUID，不接受latest。

R31在`desktop-version-provenance.mjs`实现上述上传回执与后续身份重验，并接入候选/恢复上传、四版本推广、renewal、manual recovery及来源advance/recover/rebind。回执pin沿原有journal、preview和来源证据传递，不使用自授权全局缓存。实际上传日志、出站form、响应archive/HTTP ETag、前后版本元数据及单模块字节均绑定。后续只读取版本元数据，保存的multipart明确来自原始归档，不称为新鲜历史代码下载。来源交接的binding比较保留既有规范化顺序，不混同供应商ETag与模块SHA。

## 三份旧来源的限定交接

这不是接受任意本地runtime。仅此Mac的固定三个历史UUID可使用代码中已审核的原始pin；每次重读原文件并验证模块及新鲜完整版本元数据。缺文件、改pin、未知UUID或配置变化继续停止。它们不被补写成新上传协议回执，也不授权原始旧UUID直接恢复：

- Genshin：R11原始active-version元数据（pin `61d45466...`）与11月1日capture（pin `e25c7f72...`）。原capture前后UUID/部署/script ETag相同，并已绑定原始multipart SHA `eb2a44bc...`，模块SHA `62a8007e...`。
- NTE：R15原始active-version元数据（pin `727b7381...`）与原capture（pin `8a6c8c40...`）。capture前后身份、multipart SHA `db797a59...`及原历史推广一致的模块SHA `49c71c73...`均保留。
- Main：R15原始`main-version.json`（pin `8f385c85...`）和当时已封存的`assets.json`（pin `eb0e9289...`）。后者同时绑定Main UUID、原archive SHA `280e9f58...`及前后拓扑不变，原R11只读版本记录与R22source-only树独立记录同一模块SHA `4448b3cc...`。

完整64位pin、路径、归档校验及本轮只读网络结果保存在代码和R31证据中；这些旧历史关联不是由今天的latest响应推导。R31实际验证三份旧runtime及双游戏source-select时，未请求content端点、未写云端，观察10Worker/保护7服务保持不变。

现有15分钟门禁、显式授权、七服务拓扑、仅`[game, main]`写入、partial后只读对账和旧run不重放规则不变。不增加平台或通用发布便利层。

## 实际部署创建回执

R31实测本账户的`POST /workers/scripts/<service>/deployments`成功响应只含部署`id`，不含`strategy`或`versions`。不能把缺字段误判为没有切流，也不能因此取消版本/流量校验。发布器固定发送单一已验UUID、100%流量和`percentage`策略；封存原始响应后，按返回的精确部署ID执行受支持的部署GET，要求同一ID、`percentage`和完全相同的单一UUID/100%分配。若创建响应自己带有这些字段，也必须一致。随后仍核对完整七服务活动部署与拓扑，不以历史部署GET替代当前活动状态。

创建及精确部署GET的原始正文、响应状态/headers和正文SHA分别落盘；后续步骤失败也保留已收到的响应。缺ID、读回缺字段、分配/ID不符、网络或认证失败均停止，不自动重复POST。已发生的partial必须先只读确认，再创建独立的显式兼容恢复操作；原推广/恢复journal不删除、不改写、不续跑。

## 上传模块读取与历史时长阻塞

候选和恢复共用固定账户/服务/UUID的上传后读取。二进制最多16MiB、每次180秒，仅自身传输计时器触发的TimeoutError或流中AbortError允许一次新计时器重读，最多两次；尝试状态/耗时/字节数进入content-http.json及回执pin。HTTP失败、外部取消、元数据超时、预算/解析/身份错误不重试，上传/推广无重试。四版本与全部原有门禁不省略。第四次Main上传后读取超时；随后同一UUID直连约20秒、本机现有代理约17秒均下载到同一14.45MB模块，不能宣称代理是唯一根因或把诊断下载当已完成回执。第五次Main实际约19秒完成。

第五次四版本云预览和同UUID续验均通过；推广内部重复重验完整封存链使最早证明到首个切流前约925秒，超过900秒后停止，零推广intent/POST。这是R31当时的停止点，已由下面的R32修复与真实发布取代；原失败证据保持不变。不可用mtime缓存、历史时间、延长窗口或继续失败journal绕过。


## R32 关键路径收敛与实际发布

重复验证去重只存在于同步只读`withVerificationPass`，返回值克隆，不跨await/网络/写边界。`artifactFiles`、prepared/source/recovery验证可在同一pass复用；预写拓扑等待及最终快照后重新进入完整字节校验，期间修改/到期仍拒绝。历史链测量112.56秒/975,489次文件读取降至15.59秒/80,580次；五阶段实测72.81秒，保留900秒实时门禁，未使用mtime或全局自授权缓存。

新run真实候选及恢复四版本预览/续验通过；正式推广202.16秒，Genshin/Main两次intent时最老候选证明约96.85/134.24秒，公网通过时约245.64秒。版本为Genshin `026b39f0-84a1-47ee-a50f-2ea0f42d5658`、Main `059971df-99d8-4eab-a143-b0236f098a1b`；同一releaseKey `61cf1ede43df373693eea8cb2b83641ef3791876953ab8024c0233873de0bef6`绑定候选/封存/日志/UUID，独立公网标题/JSON与NTE保留内容均验证。source-advance实际通过；这是R31真实兼容恢复后另建run成功再发，不是重试旧journal。

公共静态准备曾遇到自身超时/断流，两个只读失败目录保留；修复后最多4并发读、仅针对自身超时或已识别断流允许一次完整新读，保存每次证据，成功准备738资源约67秒且该次没有重读。HTTP错误、外部取消、字节/身份错误及所有云写不因该机制重试。

NTE共享Main交接首次失败在登记阶段重复比较历史公网robots缓存/正文，虽然前面的精确预览121/627项已通过。修复仅让strictPreview来源登记复用既有精确预览验证器：robots须noindex/deny-all，不误用公网缓存/正文；其余状态、MIME、cookie、cache、HTML/metadata/JSON-LD/media引用/静态字节与HTML robots仍拒绝漂移。新增20项登记/选择回归，真实新目录交接与再次选择通过，原失败目录不改写；零NTE上传/部署，不当作NTE正式发布。

本次成功不等于普通请求全程注入releaseKey、ReleaseMap原子激活或整个V1关闭。下一条真实NTE/独立Genshin编辑按全新run/完整门禁验后续连续性；不为验收制造编辑或批量清hold。
