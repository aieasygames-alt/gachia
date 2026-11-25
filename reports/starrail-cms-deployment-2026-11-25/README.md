# 星铁 CMS 主站部署回执 · 2026-11-25

已部署并完成正式站验收：[星铁版本页](https://gachia.com/zh/starrail/version)。首批为中文版本状态、跃迁窗口、活动奖励三条内容，事实核验日保持 2026-11-24。

- 正式 Main：`3473e29b-788d-4a9a-a847-28ba0d58557f`，100% 流量。
- 生产构建源码：`32837415799a0d5aa7356e99514d62b87f5f1d15`，分支 `codex/starrail-cms-release`。
- [CI](https://github.com/aieasygames-alt/gachia/actions/runs/45527504606) 的 Web 与 CMS 检查均通过，包含生产构建和 Wrangler dry-run。
- 正式站 15 条抽样路由、18 个页面引用静态资源的字节摘要、三语隔离及写入鉴权通过；桌面 1365px 与手机 390px 均显示三条更新，无页面异常或横向溢出。浏览器测试阻断外部第三方请求。
- 最终中、英、日版本页均返回 `Cache-Control: no-store`。首轮正式验收发现原 middleware 的一小时缓存后，另发此次修复；保留了中间发布与修复回执。
- Router、原神、NTE、蓝色星原、绿梦的完整生产快照及全部服务路由与发布前相同。Main 原有 bindings 保留，仅增加星铁专用发布 secret。Staging 用于本批验收并已更新。

日常：本机 `4320` Payload 后台 Publish，再在原工作区 `tools/payload-cms` 运行 `npm run publish:starrail`。数据同步到已有云端 D1，不依赖 Mac 在线，不必重建主站。后台 Publish 与云同步仍为两步。

完整操作与未来 Main 源码交接见 [操作文档](../../docs/starrail-cms-main-site.md)。原工作区旧主站 HEAD 与旧 CMS Main 发布器尚未接入新源码，后续 Main 构建须先完成源码交接。旧 R153 索引原样保留，未伪造为新 Main 的来源证明。保留并核对了 115 份已发布来源，不声称完成全部递归历史核验。

`deployment.json` 和 `checks.json` 是可提交的公开摘要；原始本机证据被忽略。部分早期 multipart 上传回执含发布密钥，禁止提交或分享原始证据目录。兼容恢复版本保留 CMS，但早于最终 HTML 缓存修复；内容回退须从 Payload 恢复后重新同步。
