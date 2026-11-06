# R50：历史发布证据与固定恢复接线

本轮继续第 1 项，未重复 R48 上传或 R49 completion，未切流、恢复或推进来源。第 2 至 5 项没有提前销项。

## 实现

- `unified-historical-publication.ts` 从精确历史 Git 提交重建 O/计划，重读原审核及完整 115 来源、冻结/构建/兼容资源/transport。`unified-historical-sources.mjs` 验全部五 owner 的归档、静态别名及两种原始模块证明，不要求旧 Main 今天仍活动。
- `unified:history audit|previews|published` 只接受严格 pin 请求。源、原执行器、预览执行器及适用的推广执行器 CI 分别重读，不使用当前 CMS、当前安装或状态布尔值替代历史证据。
- 推广完成态 reader 重开完整 journal、当时有效的 renewal、模块、切流创建/复查原始响应和全量公网接受。writer 将切流响应的状态、长度和 SHA 写入推广结果，防止仅靠相同部署 ID 重新拼装响应。
- `unified-recovery.ts` 固定恢复组合使用原历史基线及已知候选/兼容恢复拓扑，不调用启动时要求旧 Main 活动的生产 verifier。源模块与两版本重新读不可变元数据；恢复 HTTP 必须真实重新观察。入场要求停止推广的精确候选活动，拒绝未知/分流/其他服务漂移，独占意图、不自动重试或回滚。写组合仍私有，CLI 仅 `audit`，固定完整端到端资格待与下一批来源一起验收。

## 真实只读结果

`request.json` pin `f063c28266887c1aed85ebf3d71d4c0be5bc628059451d5b61b392613aa2288d`；`audit.json` 记录真实重读通过：115 来源、全部五 owner、1 条历史批准、候选 SHA `50a15bc167cb9ad92e1939cd5049cde58f4d5cb9f908033f03cf5463e5aea277`，源 CI `42130525825`、原执行器 CI `42143094792` 均重新核对。没有 CMS/Cloudflare 活动读取或写入，不重新批准或续时效。

`previews-request.json` pin `6ce31beb55834442e79d9f0c4d5f7a87f55f534a148a1d369f282f295ecdc6dc` 额外绑定原 completion 收据与完整执行输出。初次只读复验在旧 reader 的写前时效门禁处拒绝，原失败保留在 `previews-audit.log`，没有写云或重跑上传。已将结构身份验证与写前时效拆开：历史读取不改时间，全部写路径继续检查 15 分钟新鲜度；新增回归证明旧完成态可读、同值上传仍拒绝、未来时钟仍拒绝。修复后只读执行记录在 `previews-audit-02.log`，不复用/覆盖失败证据。

## 验证及剩余

最终本机验证：CMS 342/342；推广/历史来源/完成态/恢复协议 148/148，既有发布工具 988/988，其他 Node 304/304，Python 56/56；CMS 类型检查、文档/scope 38/38 及差异空白检查通过。日志分别为 `cms-final.log`、`release-final.log`、`typecheck-accepted.log`、`docs-final.log`。

真实历史云预览复验通过：仍为恢复 `572c9e2b-47bd-4cf4-ac1f-f6bbd0ceb446`、候选 `b4055676-45d2-460e-8d0e-3e649ddd3001`，两方向各 1,267 项 HTTP 全量重读。预览执行器完整 CI `42148840745` 重新核对，未改签任何时间。`previews-audit.json` pin `c8d5806fe23858eaefc1067ebd5a23ef982952d469769d7e96b79f6520f40534`。这不是本轮新代码的精确 CI，更不是新鲜续验或公网切流。

下一步实现五 owner/115 来源的新公开 A 索引、下一批公开 JSON 和非公开代码来源的完整消费，以及与当前活动版本绑定的 fresh handoff；联合验证固定恢复与 source-advance，再取得精确新执行器 CI。只有其后真实续验、推广、完整公网接受和实际来源接续全部完成，才关闭第 1 项。

本轮磁盘约 29 GiB 可用，没有复制新工作台。开发工作区 CMS `.next` 576 MiB 仍只是可清理建议，未删除；历史发布来源、备份和旧安装保持。
