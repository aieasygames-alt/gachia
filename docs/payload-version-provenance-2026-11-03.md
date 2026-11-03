# Payload 精确版本取证收敛方案

日期：2026-11-03，R30。状态：**调查完成，替代协议尚未实现/安装，生产仍按原协议拒绝发布**。不把本方案当作通过云验收或允许重跑R29。

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

这些是实现与验收要求，不是已经实现的能力。现有15分钟门禁、显式授权、七服务拓扑、仅`[game, main]`写入、partial后只读对账和旧run不重放规则不变。后续实现应复用既有journal与来源链，不再增加平台或通用发布便利层。
