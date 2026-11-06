# R60 真实封存历史的本机请求级回归

## 范围

新增显式运行的 `test:history-sealed`，使用保留的真实 R46/R48/R49/R50 证据，直接调用生产历史根与历史预览 reader。没有替换历史根、构建、transport、审核、来源或模块 verifier。测试不使用伪造成功响应；阻断 `fetch` 并要求请求计数为零。

仅在临时目录生成故障用请求和审核 JSON，结束后清理；不复制大型封存构建，不修改原始证据，不读取当前 CMS，不续验云预览、不推广。重新计算摘要后的审核篡改仍须拒绝，包含完整上游读取后的 release key 不一致。

该入口依赖本机保留的真实证据，不进入普通 CI，不使用跳过来冒充通过。缺少绝对请求路径或 pin 会直接失败。普通测试另行验证此输入门禁。

## 执行

在 `services/content-cms` 运行：

```sh
UNIFIED_SEALED_HISTORY_REQUEST=/Users/robert/.codex/worktrees/payload-unified-maintenance/gachia/reports/payload-unified-history-2026-11-06-r50/previews-request.json \
UNIFIED_SEALED_HISTORY_PIN=6ce31beb55834442e79d9f0c4d5f7a87f55f534a148a1d369f282f295ecdc6dc \
pnpm test:history-sealed
```

独立先行真实读取已通过：115 来源、五 owner、原 release key `806b0a875d42b2433df204385cca0329aedb357cff6f9ed2e6a3823c2b6491cb`；当前 CMS/云读取与时效续期均为 false。

本机真实封存回归 12/12 通过，零跳过，耗时约 161 秒；原始日志见 `sealed-history.log`。完整成功读取约 85 秒，重新签入错误 release key 的失败路径约 74 秒，确实经过真实上游链而非模拟拒绝。候选仍为 `b4055676-45d2-460e-8d0e-3e649ddd3001`，恢复仍为 `572c9e2b-47bd-4cf4-ac1f-f6bbd0ceb446`。

历史模块及入口门禁测试另有 12/12 通过；CMS 类型检查、文档/scope 38/38 和 `git diff --check` 通过。本轮没有改生产逻辑，未重跑整套 CMS/发布协议测试；R59 的全量结果不写成本轮新结果。

磁盘约剩 27 GiB，本轮只新增小型脚本、文档和日志。临时故障 JSON 已由测试清理，未删除旧工作台以外的证据或备份。

## 边界

本机真实历史入口回归与固定组合测试分开运行。固定组合中的历史发布根替换尚未移除；本轮没有当前精确提交 CI，没有正式推广完成态、实际公网接受或来源接续。不能把真实历史可读当作已公开发布，也不能将本机封存回归当作无替换的完整推广链资格。
