# Main 审计修复生产发布

日期：2026-10-26。结论：正式发布及完整验收成功。运行 [40310008871](https://github.com/aieasygames-alt/gachia/actions/runs/40310008871) 仅触发一次，build、deploy-staging、deploy 全部 success，无重试或自动回滚。

## 精确身份

- 生产源码：`d31c84e02caf879884b5f6783b0d5cb390c13070`，包含功能提交 `6f7a01e`；与已通过 CI 的 `19a60f1` 功能源码相同，追加部分仅为文档。
- Main 当前 100% 版本：`9addf3a5-ff70-4ad5-9419-eb82b115ec92`；deployment `fa918e80-d03f-4dfa-b3f8-6b3ba50a619f`。
- Main staging 当前版本：`776285a1-72b5-4d75-ae17-274dbae2183c`。
- 新 artifact：`12645502112`；GitHub ZIP digest `d297cd60e7596a0c7b3f2d778c934b8514e5da3c7b4d1639a9c79d9d4d361fe5`。
- 内层 tar SHA-256：`3411600defe99fbaad5de2c96936e57dda47a1a30d0d7cd3bb1ae8fd25d969cc`。
- staging 和 production 的下载日志均选择同一 artifact ID、记录相同 ZIP 摘要，恢复门禁使用相同内层摘要；未在推广时重建。该关系来自成功作业及实际日志，本机没有重复下载新 Worker 大 ZIP。

## 发布前与范围控制

用户继续此前明确的 Main 正式发布步骤后，重新 fetch、确认干净源码和 main 身份、无并发发布、内容门禁、两个发布开关开启。再次读取当前旧 Main 100% 版本 `38263bf8-7c06-4991-8e8a-b4f81bb8cf71`，核对旧 artifact `12595024086` 未过期及已下载 ZIP 实际摘要。

明确披露自动 staging → production 行为、额外 Actions 用量与当前余额不可观测后，使用现有 workflow、`RELEASE_MAIN_ONLY`、显式 rollback UUID 和旧 artifact ID/digest 发起一次发布。production environment 没有额外审批保护，本轮未配置或绕过平台规则，也未扩大凭据 scope。用户当前继续发布的授权不是游戏/Router 发布授权。

本轮只改变 Main 和必需的 Main staging。发布前后读取七个服务 deployment，确认四游戏与 Router 的 deployment ID 和版本全部不变；Main 新旧版本 bindings 深比较一致，未读取 secret 值。此比较不冒称覆盖所有服务的可变 settings、zone routes/domains 或未查询的其他 staging。

## 验收证据

| 范围 | 结果 |
|---|---|
| build | 内容、测试、类型、编译、打包、受管内容、SEO、静态资源来源与封存门禁通过 |
| staging 基础与运行时 | 32 HTTP、18 browser 通过 |
| production 基础与运行时 | 32 HTTP、18 browser 通过 |
| 每侧受管内容 | 23 HTTP、171 fallback HTTP、7 JSON、3 search、520 browser、1 未认证 IndexNow 拒绝、12 旧资源字节抽样 |
| staging 跨 owner 导航 | 8 项通过 |
| staging / production XML | 各 6 文档、6653 唯一 URL，Main 与封存产物一致，171 fallback 缺漏为 0 |
| 旧静态资源 | 封存时 435 文件/11,128,397 bytes 验证通过；云端各有界抽样，不冒称全部云端文件逐字节重验 |
| 发布后控制面 | Main 100%，四游戏/Router deployment 不变，Main 版本 bindings 不变 |

构建阶段浏览器导航为 16 通过、8 跳过；不将跳过算通过。原 ref cleanup warning、artifact action runtime 和 ubuntu-latest 迁移提示保留，未临时升级或放宽断言来消除提示。

已实际下载并校验 staging 验收 ZIP `12646406308`（SHA-256 `a5e16ccbb23363fde0268c2f035b0c2fde0e9ca941488028d757b6b3a409fd78`）和 production 验收 ZIP `12646821888`（SHA-256 `46276940f79a3f9e2b6954c63f276f2136c1ae613387905cbf118e9818840c01`）。读取有界 JSON，核对状态、检查数量及 XML 合同，不执行归档内代码。

## 修复与边界

F2 URL 解码/规范化、F3 瓦片 SHA-256/v2 命名空间、F4 公开分享到期与字段白名单已随本版 Main 上线。针对这些边界的行为证明来自前述单元测试与合成 D1/R2 的本地真实 Worker；生产验收使用无账号公共探针，不读取真实用户分享验证过期，不执行账号删除。登录仍关闭、IndexNow 仍显式暂停，没有数据库迁移或 R2/CDN/浏览器缓存清除。

旧客户端已缓存响应不会因换命名空间或响应头立即失效，本轮没有证明线上曾发生真实瓦片碰撞，也不宣称已清除所有历史缓存。若发现实际受影响内容须另行处理。

本次执行成功不等于 Actions 剩余额度已知；余额、平台分支/环境保护、S3–S8 与通用游戏/Router 远程执行器仍为独立后续事项。不再为本批修复重复发布。

完整日志、原始控制面返回和验收 ZIP 保存在忽略目录 `.release-records/main-release-2026-10-26/`。本目录提交运行结果、必要摘要及部署对账；仅文档收尾采用 `[skip ci]`，不触发重建或再次部署。
