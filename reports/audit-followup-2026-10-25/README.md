# 审计清单复核与修复

日期：2026-10-25。基线 855254b；本地候选，不是生产验收。

后续状态：本文件保留第一阶段历史结果。剩余依赖及 Worker 验证已在 `../security-runtime-closeout-2026-10-25/README.md` 完成本地收口；下方 2 条告警和未覆盖项不再代表最新候选。

当前任务与剩余风险见 `../../plans/project-task-status-current.md`。

## 文件

- dependencies-before.json：本基线 pnpm audit --prod 原始结果。
- dependencies-after.json：本批更新后的原始结果，仍有 1 high、1 moderate，不能称扫描通过。
- raw-inventory.json：90 对原始 JSON 与公开镜像核对；无待审漂移或事实 holds，但不代表全站事实验证。
- gachia-fix-*.log：各项本地验证原始日志。build 为主站 Next 生产构建，不是 Worker 云端部署。

## 已完成验证

Web 376、Data 162、Router 35 项通过。Admin 265 通过、17 跳过。发布工具 240 项 Node 测试和 30 项 Python 测试通过。九包类型检查、冻结离线安装、数据验证、manifest 验证通过。Web lint 仅有既有 AuthDialog ref cleanup warning。

主站、原神、异环、蓝色星原、绿梦共五个 Next 生产构建全部通过，四个游戏各自的 build 日志已保留。没有运行 deploy 或 upload 命令。

地图新增测试在测试模块中临时模拟账号开启，以验证休眠代码的成功/失败路径；产品的 accountFeatures=false 完全不变。内存 SQLite 验证精确 SQL 对重复键无操作，但外键失败仍报错；不等同生产 D1 或真实用户验证。

## 未覆盖

尚未对本次依赖更新执行完整 OpenNext/Worker 打包、包体、各游戏浏览器及跨 Worker 回归。没有读取真实账号数据，没有云端写入或生产发布。
