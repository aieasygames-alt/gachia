# Payload R18：源码冻结、安全同步与真实验证 CI

日期：2026-11-02。承接 R17 后的 L06。保持本机 Payload/PostgreSQL、仅本机编辑和发起内容发布、事实准确度后置的方向；本轮是工程交付，不是网站内容发布。

## 结论

**源码冻结、专用分支同步及真实 GitHub 验证 CI 已完成。L06/T12 整体仍为部分完成。**

- 源码提交：`66df8bc8e3d0fa6b4bb1f56246223ef10861c7f5`。
- 私有仓库专用分支：`codex/payload-unified-maintenance`，已推送并校验远端精确 SHA。
- 实际 push CI：[Payload Verification Only / 41397758661](https://github.com/aieasygames-alt/gachia/actions/runs/41397758661)，精确源码提交，全部成功，verify job 耗时 4m14s。
- `main` 仍为 `71a52728be2c9612d0b39be47092b7d85a320ac3`；未合并、未创建 PR、未执行网站部署。
- 本机 CI 环境回归：CMS **161/161**、Next typegen/typecheck、桌面发布 **359/359**、既有 Node **304/304**、Python **45/45** 均通过。

## 冻结范围与凭据边界

通过源码交付白名单与 Git 改动清单取交集，逐文件检查路径、普通文件身份、有限凭据模式和 SHA。提交 **293 文件 / 3,449,970 源码字节**：独立 CMS、共享 shadow 读侧、本机双 owner 发布/续验/恢复、加密备份工具、测试、锁文件、现行文档和必要报告 fixture。提交后再次从 Git object 读取全部文件，逐项与冻结清单核对一致。

未使用 `git add .`。运行 settings/env、数据库、私有媒体、密钥、备份、云 multipart、发布 journal 和非白名单原始证据不入 Git；约四千份历史/原始证据仍留本地。这是有限扫描，不宣称普遍证明所有秘密不存在；GitHub 仓库保持私有，也不以私有仓库替代凭据审查。

生成的初始 SQL migration 和真实 robots fixture 保持已验证字节，不为消除空白警告修改。默认 `git diff --cached --check` 仅报告这两处生成缩进/行尾空白，排除这两文件后的源码检查通过；没有隐藏功能性差异。

## CI 安全与实际修复

workflow 只接受专用任务分支 push，并保留手动入口；job 还要求精确任务分支 ref。仅 `contents: read`，checkout 不保留凭据，不引用仓库 secrets，无 Cloudflare 操作、发布或生产数据库入口。根工作区及隔离 CMS 各自 frozen-lockfile 安装，固定 Node `22.23.4` / pnpm `10.10.0`，执行类型和 CMS/发布回归。没有修改任何旧部署 workflow；两个 Cloudflare GitHub 部署开关仍为 `false`。

本地按 `CI=true GITHUB_ACTIONS=true` 运行发现两项测试在检查参数前就被真实桌面 CLI 的 CI 禁令拒绝。新增 parser-only 子进程 probe：仅对该子进程开放真实 argparse，拦截运行 settings/安装入口、文件打开、进程/网络操作；有效运行命令必须失败。最终收口扩大 probe 验证到 status/install/serve/resume-install/publish-prepare，覆盖正常维护锁以外的安装和启动入口。新增回归证明真实 manager 即使 `--help` 也仍在 CI 拒绝。**没有在 workflow 全局清除 CI，也没有放宽真实 manager 的运行门禁。**

真实 Linux runner 的安装、CMS typegen/typecheck、CMS 测试、发布工具测试全部成功，原始日志与 job/step 回执已下载。本机运行结果不冒充真实远端 CI，也未跳过 Linux 上失败的测试。runner 唯一注释为 ubuntu-latest 即将迁移 Ubuntu 26 的平台提示，不是测试失败。

## 状态与剩余任务

| 项目 | 本轮状态 | 剩余 |
| --- | --- | --- |
| L06 / T12 | Git 冻结/安全同步与真实验证 CI 完成 | 资源/兼容恢复证据命令化及完整交接仍缺 |
| L03 / T11 / P7 | 沿用 R17 私有异地密文和同机隔离恢复 | 独立密钥托管、跨机应用重建/启动仍未验 |
| L04 / L05 / T04 / T06 | 本地双游戏发布/续验/恢复协议已安装 | 无真实编辑候选，首次/连续云发布、partial failure 与云恢复仍未验 |

**下一可执行优先级：资源/兼容恢复证据命令化**，减少首发手工生成输入的步骤；真实编辑候选出现时优先 L04/L05 的精确云预览、推广、公网与恢复验收。不因源码已推送就批量清 hold，不制造演练文案或无变化发布。T12、P7 及完整平台范围不整体关闭；内容校对、全类型迁移和通用批量运营继续后置。

## 运行完整性与证据

冻结前 CMS healthy、两持久服务 loaded；DB 逻辑摘要仍为 `c41f3179e0ed3f60b1fc25a58ed30c5e715a85f90da14310c4ae9eb230b70211`，84 条 draft/hold。18 个 publisher 模块和 manager 的 19 文件与 R17/R15 及源码一致。七网站服务只读快照与 R17 一致。本轮不重启 CMS、不编辑内容、不上传 Cloudflare 存储或网站 Worker、不切流、不修改已安装运行文件。

- `git-freeze.json`、`freeze-candidates.json`：范围、提交/远端 SHA、逐文件摘要及排除说明。
- `ci-env-before.log`、`ci-env-after.log`、`cms-verification.log`：真实失败及本地 CI 环境回归。
- `github-code-run.json`、`github-code-run.log`、`github-first-watch.log`：实际 push workflow、精确源码提交和成功的逐步结果。
- `verification-summary.json`：可随 Git 交付的源码提交/实际 CI 测试计数与剩余边界摘要。后续状态及 probe 加固提交的最终 HEAD 回执另存 `github-final-run.json` / `github-final-run.log`，不将首个提交的通过结果冒充最终 HEAD 的结果。
- `local-before.json`、`publisher-before.json`、`cloud-before.json`：本机数据/已安装代码和七服务快照。

原始日志和运行证据默认仅保留本地；Git 只接收经审查的报告/摘要，不批量提交整个报告目录。报告中的源码提交固定指向先前 code commit，不循环把后续报告自身的 SHA 写入自身。
