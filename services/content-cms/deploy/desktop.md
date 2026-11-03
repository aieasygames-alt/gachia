# Gachia 本机 Payload：现行操作入口

更新：2026-11-03（R30）。现行步骤已合并到 [Payload 最短操作手册](../../../docs/payload-operator-runbook.md)，避免多轮增量混用；当前完成范围见 [V1有限计划](../../../plans/payload-v1-completion-2026-11-03.md)。

- CMS/PostgreSQL只在这台Mac运行，不要求第二台Mac或跨机启动验收；公众站点仍在Cloudflare，不依赖Mac在线。
- R30最新异地备份的本机隔离恢复、真实应用登录/导出/重启验收已通过；独立密钥托管仍待办，不把本机恢复称为整机灾难恢复。
- Genshin/NTE + Main 的发布、精确云预览、续验和显式兼容恢复工具均已安装；真实编辑候选的云验收尚未完成。
- 内容准确度不是首发前置；保留真实发布意图、身份/版本/安全门禁和新媒体权利边界。
- 用户已给予所需操作默认授权，不重复确认；不制造编辑、不上传诊断候选、不删 journal 或自动重试写入。
- 默认后台 `http://127.0.0.1:3100/admin`；状态入口 `python3 "$HOME/Library/Application Support/GachiaCMS/desktop.py" status`。
- `settings.json`、初始凭据、数据库/媒体/backup 和发布状态均为私密数据，不放进源码交付包。
- deepmerge 仍1 low，限定本机单用户临时接受，见 [风险决定](../../../docs/payload-dependency-risk-2026-11-02.md)，不宣称漏洞已修复。

旧批次的执行过程与证据保留在reports，不再作为当前操作说明。当前任务以 [V1有限计划](../../../plans/payload-v1-completion-2026-11-03.md) 和 [任务状态](../../../plans/project-task-status-current.md) 为准。
