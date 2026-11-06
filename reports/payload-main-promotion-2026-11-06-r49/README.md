# R49 已知恢复版本的预览观察续接

2026-11-06。按用户确认的 1 → 2 → 3 → 4 → 5 继续。第 1 项仍进行中，后四项未执行；没有将预览上传、代码通过或历史验收写成正式公开更新。

## 原始停止记录

- R48 执行器 `ccd0416ad0f6973d4904e68eecd32a57bd45877e` 的完整 CI `42143094792` 成功，随后真实 Main-only 只读生产预检通过。源 CI 仍为 `42130525825`，业务源码和真实 CMS 审核仍为 R46。
- 原始 release key 为 `806b0a875d42b2433df204385cca0329aedb357cff6f9ed2e6a3823c2b6491cb`。原审计和上传请求逐字节相同，SHA 为 `99b9b4da50e8c5ab9ff754388ab4418b8060d702ca1e730e10e05c91f1e77b7e`。
- 仅恢复版本 `572c9e2b-47bd-4cf4-ac1f-f6bbd0ceb446` 已上传；原始 multipart、上传时不可变模块回执和版本元数据均保留。首个精确 HTTP 请求在连接前失败，`observations:[]`、`error:"fetch failed"`；没有候选上传意图，没有推广。原 journal 的六个阶段完整保留，失败后只读对账为 `baseline_active`，没有受保护拓扑漂移。
- 公众 Main 仍 `c2615493-d3da-4598-b488-1583cc734311`；原神 `8c75bec6-f269-4684-9601-5cf9ca441fce` 和异环 `c1247d65-734d-42a9-8f6f-16d6ab0a1173` 保持。不得重跑原上传入口或再次上传恢复版本。

## 网络与版本化解析

- 只读检查 Mac 的现有 PAC，发现本机 SOCKS5 `127.0.0.1:1080`；没有执行 PAC JavaScript、改系统代理、硬编码远程 IP、禁用 TLS 或新增 Tunnel。
- 新 reader 复用已安装的 Playwright APIRequestContext，只允许显式无凭据 loopback HTTP/SOCKS5 代理和自有精确 Worker 预览 HTTPS GET。空 Cookie、验证 TLS、无跳转、无重试、30 秒超时；每份响应读取后释放，不启动浏览器或使用用户 profile。
- 前两次独立只读诊断因流式 HTML 指纹不符停止，保留 `network-recovery-01` / `02`。将 UA 固定为原 Node-fetch 的 `node` 后差异仍存在；不能据此断言根因是 UA。已保存响应显示标题值、正文与资源集合一致，但 title 可能在 body 输出，hreflang 与最后脚本的相对位置不同。
- 原 `unified-html-fingerprint.py` 未改，历史 pin 及默认 legacy-v1 语义保留。新增 `streaming-v2`，其 pin 绑定旧解析器和新文件；标题始终单独比较，语言链接按完整属性及数量比较，脚本/样式和其他资源仍严格保序。新规则必须显式选择，不能将旧证据改签为新版本。
- `network-recovery-03` 使用新规则对同一已上传恢复 UUID 的完整 1,267 项诊断全部通过，证据 SHA `98259ad63863fb2544623b947ce7e26cc3925e7d4fe8fd7e2acea6baffc494ac`；没有跳过资源、公开 JSON 或正文。诊断不授权上传或推广。

## 受限续接合同

- 新入口只接受原始已知恢复上传、零 HTTP 观察、无候选意图、基线未漂移的六阶段停止链。语义失败、部分 HTTP、未知上传结果和候选尝试一律拒绝。
- 同时重验原始和当前精确执行器完整 CI；继续使用原 release key，而非以工具升级重新发布内容。请求只有外部 pin 和新 CI run ID，不能传 owner、依赖注入、跳过 CI、恢复重传或推广权限。
- 新独占 journal 和目录先观察既有恢复 UUID，重新验证云模块身份和全部 HTTP，再仅首次上传候选。两方向均需新鲜的完整云接受；任何失败永久停机并只读对账，不自动重试或回滚。原失败 journal 不改。
- 本批生产资格仍只有已审核无限大下载指南中文正文单条试点，不能据此放行其他游戏或字段。

## 验证与余项

定向 Node 回归 55/55、CMS 生产与续接回归 21/21、CMS 类型检查通过。补充停止证据 chronology/schema 拒绝用例后，完整本机 CMS 308/308、发布工具 988/988、其他 Node 304/304、Python 56/56 全部通过，文档与 scope 门禁通过。续接执行器 `ca0fc9c963b6ed13461c98ebf17f74bc0f0d5159` 的精确完整 CI `42148840745` 随后通过。

## 实际续接结果

- 真实只读生产续接审计通过，审计与执行请求逐字节相同。恢复 UUID `572c9e2b-47bd-4cf4-ac1f-f6bbd0ceb446` 只重读、不重传；候选 UUID `b4055676-45d2-460e-8d0e-3e649ddd3001` 仅首次上传一次。没有执行原上传入口，也没有重放本次续接。
- 独占 completion journal 完整七阶段，终态 `all_cloud_previews_accepted_no_promotion`。恢复与候选各 1,267 项精确 Host HTTP 全部通过；两份接受在结束时满足原 15 分钟门禁，未改时间戳。收据 pin `0b05868a8d601307c59b398c5dcdc70510ba93c994225fe9d46fef79d6773bb9`。
- `completion-independent-recheck.json` 独立重新打开两份 HTTP、版本与上传模块回执，核对原停止四份证据未变和请求逐字节相同。该复验不延长云观察时效、不授权推广。
- `public-after/result.json` 五项公网观察确认公开 A 未变：原神 32 篇（含公开新增 checklist）、异环 53 篇、Ananta 仍旧正文、账号继续关闭。没有生产推广或统一来源接续。

## 推广基础接线

草案中的完成态 reader、推广协议、Main 专用 deployment writer、完整公网 HTTP 验证和只读对账已移入正式 `scripts/`，修复迁移后的依赖路径。新增证据目录的直接父目录、UUID 命名、固定 renewal 子目录及符号链接限制；对账拒绝缺段、乱序、停止后续写和缺失败观察的 journal。固定 `unified-main-reconcile.mjs` 只有只读能力，不授予接受、恢复或来源接续。

CMS request/wrapper 与 CLI 已接入，**CLI 只允许 audit，拒绝 promote/recover**。内部推广组合保持非导出，尚不能实际切流。隔离兼容恢复核心只允许已停止 promotion 的已知候选转至原兼容恢复，绑定原模块/资源身份、新鲜来源与 HTTP、独占 journal；25 项拒绝/失败测试通过，尚无固定生产恢复适配器。推广/完成态 reader/公网/对账/CLI 的 80 项测试和 CMS 两项边界测试通过，类型检查通过；新实现不复用上方旧提交的 CI 作为上线资格。

新增 `verifyUnifiedHistoricalReview` 从完整封存源码及原审核摘要复验历史值，重跑三方导出并核对全部来源，不查询当前 CMS、不重新批准内容或续时效。18 项隔离测试通过；已对真实 R46 的 115 来源执行独立复验，确认 1 条历史审核和候选 SHA 完全相符，见 `historical-review-independent-recheck.json`。它仅关闭本批历史审核重读切片，不是已完成发布 reader 或 source-advance；发生无法反向重建的三方合并时仍拒绝，需另行封存原审核值，不得用未来 CMS 文档冒充。

最终本机验证：CMS 328/328、新增推广/完成态/公网/对账/恢复协议 105/105、既有发布工具 988/988、其他 Node 304/304、Python 56/56；CMS 类型检查、文档与 scope 门禁、差异空白检查全部通过。日志分别为 `promotion-final-cms.log`、`promotion-final-release.log`、`promotion-final-typecheck.log`、`promotion-final-docs.log`。上述新增实现仍未取得独立的当前精确完整 CI，未执行新的生产写入。

首个正式闭环仍未关闭。剩余是固定生产恢复适配器、可独立重读且不依赖未来 CMS 审核状态的统一 source-advance/下一批 reader、当前精确完整 CI、两版本新鲜续验、真实推广和完整公网接受。`draft/READINESS.md` 记录余项，不是可执行生产入口。

当前可用空间约 28 GiB，没有删除备份、密钥、旧应用或历史发布/恢复链。最终 `du -sh services/content-cms/.next` 为约 576 MiB，可再生但仍仅为清理建议；常驻安装目录、封存构建、冷备和上传/恢复证据不属于这项缓存建议。
