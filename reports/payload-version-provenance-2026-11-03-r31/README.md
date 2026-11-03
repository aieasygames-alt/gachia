# R31 精确版本取证与真实发布推进

日期：2026-11-03。目标是首次可用的本机Payload→Cloudflare文字发布，不扩大CMS平台、不要求第二Mac、不以内容准确度阻塞。**首次完整公网发布仍未完成。**

## 当前结果

- 唯一真实编辑仍为既有Genshin上手指南标题“原神快速上手指南：基础操作、元素反应与资源规划”；releaseKey `61cf1ede43df373693eea8cb2b83641ef3791876953ab8024c0233873de0bef6`。本轮不改DB/正文事实/媒体/其他83记录，DB为83draft/hold+1published/eligible。公网仍“原神快速上手指南”，JSON SHA仍`8d0c81f541218f4df90fb9766fa13351bd8ca1147f012be36bb694db3accc310`。
- 实际partial后已显式兼容恢复Genshin/Main，source-recover与重新选择通过。活动Genshin `bae93d58-6afb-45eb-a1a6-1cb24267e620`，Main `be4df0ed-81d9-48ec-b8c7-8182b4883db7`；NTE仍`cb854ebe-544d-40b6-9217-5df329a8a1cb`。观察10Worker，保护7服务；只曾写Genshin/Main，Router/NTE/staging保持，无Tunnel/Mac回源。
- 第五次全新run `61cf1ede43df3736-5ea147ae43ae` 的候选/恢复四版本实际上传、Genshin389/Main628项精确云HTTP与四版本身份通过，新鲜续验通过；封存范围覆盖body/metadata/JSON-LD、sitemap/robots、media引用、静态、cache/cookie/noindex及另一个游戏JSON。不是完整资产清单或全owner验收。
- 正式推广在首个intent前因本地重复校验封存链耗尽15分钟窗口，最早证明到停止时约925秒，已fail closed。第五次零部署POST，无source-advance/rebind/首发成功；不能把预览通过写成上线。

## 五次真实尝试

1. 原始run：四版本上传/预览通过；部署POST实际只返回id，旧校验误拒绝后发生partial。显式恢复的早期尝试含OAuth过期和已切Genshin但旧校验拒绝；修复精确部署GET后，两owner兼容恢复成功，source-recover/选择/独立HTTP与四回执验证通过。所有journal保持。
2. 第二次：候选两版本成功，恢复上传在只读preflight的fetch失败，零恢复上传/零部署POST；控制器已结束，无未来排队写入。
3. 第三次：候选两版本成功，Genshin恢复上传已返回UUID；随后的30秒模块读取超时，未形成有效恢复回执，零部署POST。已返回UUID只读对账；未续跑。
4. 第四次：候选两版本成功，Genshin恢复预览通过，Main恢复上传返回后180秒读取超时；零部署POST。随后同UUID直连/本机代理均下载匹配14.45MB模块，证明间歇性读取问题，不称代理为唯一根因。诊断没有变为成功恢复回执。
5. 第五次：全部四版本云预览/恢复回执/新鲜续验通过，正式推广重复本地重验导致证明过期，首个intent前停止。四回执和生产控制面/公网已再次独立只读核验，无内容变化。

R31总计17个实际版本上传、4个部署POST（均在原始partial与显式恢复阶段）；本轮后四次零部署POST。显式OAuth续签次数见delivery，另有已有Wrangler登录刷新不混算；不把无intent检查算Worker写入。原失败journal/归档完整保留，不重放云写、不延长900秒。

## 已关闭的工程缺口

- 上传回执绑定日志/UUID、出站multipart、封存模块SHA、实际ETag/字节与前后不可变版本。ETag不是模块SHA；三份旧历史capture只接受已审核原始pin，未知外部UUID拒绝。候选/恢复/续验/来源全链已覆盖，归档字节不冒充新鲜历史下载。
- 部署创建POST只返回id时，封存原始POST并GET返回的精确部署ID，核对同ID、percentage、正确UUID/100%，再核对当前活动七服务拓扑；HTTP/配置/身份错误停止，无写重试。
- GET瞬时TypeError固定HTTPS白名单/最多3次；HTTP错误/任意域名/外部取消/云写不重试。候选/恢复大文件共用180秒与16MiB预算，仅自身传输超时最多重新GET一次，重新计时且保留尝试；元数据/HTTP/身份/预算错误不新增重读。HTTP采样最多4并发并保留原序号与全部失败证据。
- package命令补入此前漏列的read-sampling与version-preview回归；当前本机桌面745/745、其他Node304/304、Python49/49。精确代码提交`2d041f5b1572a65d10c989ac169d5be445ca9c64` CI成功（CMS165/typecheck/Router/inventory与完整发布测试）；最终文档CI另存，不冒用旧提交。
- 本机25发布模块+manager+2helper共28文件维护锁下备份/原子安装/逐hash与无网络smoke通过；未重启CMS、未改数据库。R29/R30封存证据保持原样，最终交付逐文件复核。

## 证据入口

- `actual-recovery.json`、`recovery-final-audit.json`：真实partial/显式兼容恢复/source-recover。
- `second-attempt/`、`third-failure-audit.json`、`fourth-failure-audit.json`：停止/实际上传UUID/无切流及不完整回执拒绝；第三次暂停控制器已恢复仅为观察失败并退出，无残留pipeline。
- `fifth-attempt/`、`fifth-stop-audit.json`：四版本完整云预览、续验、过期拒绝时间/年龄、原始公网正文和当前版本/四回执只读对账。
- `installation-transfer-read.json`、`local-after-publication.json`、`installed-integrity-after-publication.json`：最终安装/本机健康/DB摘要不变；文件名沿用既有审计器，不表示发布成功。
- `run-proof-index.json`、`evidence-index.json`、`delivery.json`：五次run的回执/日志/原始响应pin、非循环索引及精确Git/CI/最终只读观察。必须保留私有原目录，索引不是自包含备份。

## 剩余优先级

1. **C03推广关键路径耗时**：剖析readPromotionEvidence/verifyRecoveryCloud/verifyRenewalFiles及continuation反复verify，去除同一命令内重复全树读取；保留内容级完整性、写前变更拒绝、四版本/当前UUID/拓扑和900秒门禁。实现与时长预算验收未完成，不用mtime缓存/改时间/延长窗口解决。
2. 关键路径有余量后新run完成首发、公网验收与source-advance；再做真实独立正常连续发布和恢复后再次成功发布。没有真实编辑不制造变化，不盲目第六次上传。
3. C04 NTE真实发布与双向共享Main接续；本轮仅保留NTE JSON，不声称NTE已发布或真实重绑定已验。C05b独立key有真实目的地再验，C05a沿用R30关闭，不要求其他Mac。

C01工程关闭；C02实际恢复/来源接续通过但成功再发仍待；C03/C04/C05b未全部关闭。P0–P7/T01–T12完整全类型/全owner/ReleaseMap、普通请求全程releaseKey、队列/角色/权威移交等原始范围不整体升级。身份回执不等于普通请求releaseKey注入或原子激活；账号级仅本机发布约束未宣称完成。
