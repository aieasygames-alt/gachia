# 分支推送与 Main 只读远端预检

日期：2026-10-26。已将 `6f7a01e`、`caea9ff` 推送至 `origin/codex/security-runtime-closeout`。推送前重新 fetch，没有分叉；main 仍为 `334de6e`。没有创建 PR、合入 main、触发 Actions、上传 Worker、切流、修改平台配置或读写真实用户数据。本报告后续提交仅为证据与任务状态。

## 当前控制面快照

- Main 当前唯一 100% 版本：`38263bf8-7c06-4991-8e8a-b4f81bb8cf71`，deployment `ccbff012-40dc-47b5-9aff-f63aa4ccbad1`。
- Main 版本中的 DB、R2、self-reference service、ASSETS 和公开 URL 变量与当前本地配置相符。未读取 secret 值，未查询数据库内容。
- 同时读取 Main staging、Router、四游戏最新 deployment，均为单版本 100%；具体身份见 control-plane-summary.json，与此前记录一致。
- 该快照不是所有服务的完整配置审计：未核验可变 settings、routes/domains、全部 staging 或发布时未来状态。正式发布前仍需重新核验。
- 分支 Actions 查询未发现运行；没有为观察状态消耗新的 workflow 运行。

## 旧制品来源与实际字节

- 旧 artifact：`12595024086`，可信 main 来源 `e011d3e9950000275d9bbdcd55bec8e5b1d79eb5`，workflow `.github/workflows/deploy.yml`，运行 `40182701738` 第 2 次尝试成功。
- build、deploy-staging、deploy 均成功；部署日志明确选择该 artifact ID，并报告当前 Main UUID。本次不需要失败部署的独立恢复回执。
- artifact 未过期，expires_at 为 `2026-11-24T10:17:19Z`；期限应在真正发布时再次核验。
- ZIP 实际下载 54,244,295 bytes，SHA-256 `77fe18ca9d3053fcc3e5f0e3634db6732a8ff40210e2e036364d6ce6e64d4b11`，与 GitHub metadata 和历史记录一致；不是仅比较 metadata。
- 安全提取器只提取规则允许的 Next 静态文件，不执行旧包代码，不恢复数据库或替换新 Worker。

## 本地旧资源兼容

在忽略目录生成独立 compatibility-candidate 副本，保留此前 clean candidate 和归档不变；使用既有 retainWebAssets/verifyRetainedWebAssets 校验全部同名资源冲突与摘要。

- 旧静态资源 435 文件，共 11,128,397 bytes。
- 88 文件与新候选同名且摘要一致；新增复制 347 文件，没有不可变资源冲突。
- 隔离副本的文件可移植性验证通过；仅绑定本地 ASSETS 启动 Worker，逐个 GET 435 个旧资源，状态、长度、SHA-256 全部匹配。
- 同一隔离 Worker 的 32 条基础 HTTP 检查通过，进程已停止。本轮未重复 browser 套件，前一轮 clean candidate 已有 18 个场景通过。
- 本结果是本地兼容证明，不是正式 staging/生产静态字节验收，也不是整站回退演练或旧前端全部交互验证。正式流程仍须重新绑定可信旧来源并完成自身门禁。

## 未闭合事项

1. 候选尚未合入 main，production workflow 要求 refs/heads/main。远端 main 的旧发布入口不会因候选分支推送而关闭。
2. production environment 当前 protection_rules 为空、deployment_branch_policy 为 null。环境名称不代表已配置审批；本轮未擅自添加保护或放宽流程，正式执行须明确授权并确认审批安排。
3. GitHub Actions 月度额度无法核实：账单 API 返回 404，并提示当前凭据缺少 user scope。没有自动扩大授权，不把无法查询解释为额度充足。
4. 未查询 Cloudflare 当前套餐；旧资源在线验收、正式 staging 同制品验收、跨 owner 和最终生产验收仍待执行。不能用本次本地副本绕过正式 Main workflow。

Wrangler OAuth 提示缺少若干新增产品 scope，但本轮所需的 deployments/versions 只读查询成功；未触发重新登录或扩权。原始身份信息、完整控制面返回、部署日志、ZIP、本地状态与候选副本仅存放于 `.release-records/remote-preflight-2026-10-26/`，报告仅保留必要的精简结果。
