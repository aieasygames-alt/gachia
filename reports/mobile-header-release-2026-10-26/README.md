# 移动端导航修复发布门禁（2026-10-26）

本轮只推进 Main 移动端 sticky header 修复，不发布四游戏或 Router。初始基线为 `71d7851`，与本轮开始时重新 fetch 的 `origin/main` 一致。前一轮本地修复证据见 `reports/mobile-header-fix-2026-10-26/README.md`；原始线上发现保留在 `reports/online-verification-2026-10-26/README.md`。

## 验收门禁补齐

- `.github/workflows/deploy.yml` 增加 staging/production 的实际已发布 header 绘制测试，每侧 42 场景、明确零重试。staging 作业失败阻断 production，不设置 continue-on-error，不自动重试、回滚或重发。
- 两侧既有验收 artifact 追加 JUnit 结果与失败截图目录；不额外上传所有成功场景的大体积截图。原来同一 artifact/内层摘要、旧静态资源保留、内容/XML、版本重读和账号停用门禁不变。
- 新增发布契约测试检查固定 origin、阶段依赖、零重试及 always 保存结果；本地发布测试为 Node 301 + Python 31 通过。

## 当前执行边界

本节为初始发布前记录，后续按实际结果追加，不以本地通过代替云端验收。账号删除保持取消；没有真实账号/分享/R2 业务数据操作、数据库迁移或缓存清除。公网 NUL/点段契约差异不属于本次修复，继续保留。
