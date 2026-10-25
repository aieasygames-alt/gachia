# 依赖安全修复生产推广

最新结果：完整同制品复验后，原运行第二次尝试成功，Main 已发布为 `38263bf8-7c06-4991-8e8a-b4f81bb8cf71` / 100%。成功的 build 未重跑，失败作业复用原 artifact `12595024086`；staging 重新部署同一制品并通过全部门禁后才推广生产。第一次失败保留、根因未证明。完整身份、诊断变更、验收和未升级游戏边界见 `reports/security-production-release-2026-10-25/README.md`。下文为分阶段记录。

用户已明确授权推送本批提交，并在门禁全部通过后执行生产部署。工程提交为 `6906e5c`，基线为 `855254b`。账号保持关闭，不执行数据库迁移、路由修改或清理。

## 发布前记录

- 修复分支已推送；本地发布测试 244 项 Node 和 30 项 Python 再次通过，内容门禁通过。
- Cloudflare 只读快照确认 Main 当前单版本 100% 为 `c96323b1-c9a3-4390-aa7d-d17a4fa83c45`，其他 owner 与 S2.23 记录一致。
- 前版 Main 产物 `12585908102`，ZIP SHA-256 `c15aed231444dae9520192aac6b1239dad5c82e08f24c90d22f846fd0c63de6c`；独立恢复回执 `12587311797`，ZIP SHA-256 `103cd3d6e09ef07da5f8e5e0c332c131ffa648e22ebb4397114f5c2ef9551f55`。执行时仍验证来源与摘要，不凭文档放行。
- GitHub Actions 用量接口缺少 user scope；Cloudflare subscriptions 返回 403。未扩大凭据权限，余额和套餐未知。主站 dry-run gzip 2896.82 KiB，按保守 3 MiB 上限检查。
- GitHub production/staging 环境没有独立 protection rules，本次由用户明确授权，不声称具备独立审批机制。

## 执行边界

本准备文档以 `[skip ci]` 集中推送，避免一次普通 push 验证加一次相同的手动生产构建重复消耗 Actions。手动 production 仍执行全部 build、staging、旧静态资源保留、同产物生产推广与验收门禁，不跳过测试。预计 Main 一次完整流程约 30–50 runner 分钟，实际用量以运行记录为准。

Main 先执行；四个游戏必须分别完成当前旧资源来源、封存、预览与同产物推广，Main 成功不能代表全站依赖升级完成。任一阶段失败停止后续切流，保留现场，不盲目回滚或重跑。

现场证据保存在 `.release-records/security-production/`。本文件是执行计划，不是已部署声明。

## 实际结果：staging 门禁阻断，生产未更新

`6906e5c` 及准备记录 `e011d3e` 已推送 main。手动 production 运行 [40182701738](https://github.com/aieasygames-alt/gachia/actions/runs/40182701738) 的源码为 `e011d3e9950000275d9bbdcd55bec8e5b1d79eb5`。build 成功、deploy-staging 失败、deploy skipped；没有重跑或绕过失败门禁。

- 本地直接下载前版产物首次 300 秒超时；经已有代理重试后，ZIP 摘要、恢复回执和全部 386 个旧静态文件 / 10,706,875 字节通过。原失败日志保留。
- CI build 完整通过，封存新产物 `12595024086`，ZIP SHA-256 `77fe18ca9d3053fcc3e5f0e3634db6732a8ff40210e2e036364d6ce6e64d4b11`。
- staging 部署、基础 smoke、旧静态资源校验通过；32 个 HTTP 边界检查和基础运行时之后，完整受管内容验收在 390px 访问 `/ja/roco/guides/global-player-discovery-codex-playbook` 时等待 `networkidle` 超过 60 秒，失败时间 `2026-10-25T10:27:55Z`。后续 staging XML/跨 owner 验收未运行，不算通过。
- 故障截图已显示文章，但这不证明所有资源和交互完成。随后在同一 staging 版本对该页做有界只读复核，390/1440 两视口均 200、networkidle 成功、失败请求 0、待完成请求 0。未重现不能将原 CI 失败解释成已证明的偶发网络问题，也不能替代完整验收。
- 失败证据产物 `12596380089`，ZIP SHA-256 `651c0e7b6e642b215c8adce54361f6b95c016dc9599ae725e631cd5c0c652501`；staging 结果产物 `12595658316`。两份证据已下载，失败日志和截图保留。
- 只读 Cloudflare 复核确认全部生产部署、路由、域名、绑定与前态一致。Main 仍为 `c96323b1-c9a3-4390-aa7d-d17a4fa83c45`；仅 staging 更新为 `4e9dd919-c6a7-45b1-b5f7-baeb56592a99`。读取时 OAuth 过期先返回 401，经 Wrangler 正常刷新后完成对账，不省略失败记录。
- build 21 分 13 秒、staging 10 分 22 秒，合计约 31.58 job-wall 分钟；不等同于计费分钟或剩余额度。此次只启动一个 Actions 发布运行。

下一步先定位超时请求/导航边界并完成同一封存制品的完整 staging 验收；不得放宽断言、仅凭单页重试或重新部署凑成功。生产和其他游戏推广继续停止。已有用户发布授权保留，但执行条件尚未满足。
