# F3 地图瓦片缓存身份修复

日期：2026-10-25。基线：`334de6e`。本批保留此前 P1、F2 和已批准的 119 份旧浏览器记录清理，仅修改瓦片 API、增加回归测试并更新当前任务表。未提交、推送、构建或部署。

## 变更

- 原 `map-tiles/<mapId>/<32-bit hash>` 改为 `map-tiles/v2/<mapId>/<SHA-256 hex>`。采用 Workers 支持的 Web Crypto API，不引入 Node 运行时依赖。
- 摘要输入为通过现有白名单验证后的 `parsedUrl.href`，与实际 fetch URL 一致。域名大小写、显式 HTTPS 默认端口等 URL 等价表示复用缓存；不同 map ID 仍隔离。
- 不回读旧命名空间，不迁移、不覆盖、不删除旧对象，防止旧碰撞内容继续由 R2 命中。
- URL 白名单、响应大小/类型校验、R2 不可用时回源、异步写入和响应头策略保持不变。Router、其他 Worker、绑定、数据库和账号开关均未修改。

## 测试与证据

`apps/web/__tests__/map-tile-cache.test.ts` 直接调用真实 GET；R2 使用内存替身，上游返回合成字节，未访问真实瓦片或云端存储。测试用 Node crypto 独立计算预期摘要，生产实现使用 Web Crypto。

- 修复前：14 项中 3 失败、11 通过，复现 Aa.png / BB.png 内容串用、旧键命中和 URL 别名身份问题。
- 修复后：新增 14 项全部通过，包括已知碰撞分别 MISS/HIT、旧对象保留、规范化 URL 复用、map ID 隔离、非法输入提前拒绝、R2 绑定/读取/写入失败及非法上游内容不入缓存。
- `pnpm --filter @gachia/web test`：80 文件、427 项通过（包含 F2 回归）。
- `pnpm --filter @gachia/router test`：35 项通过。
- `pnpm --filter @gachia/web type-check`：通过。
- `pnpm --filter @gachia/web lint`：0 error，保留既有 auth-dialog ref cleanup warning。
- `pnpm test:release`：Node 300、Python 31 项通过。
- `git diff --check`：通过；119 个已批准删除的旧记录仍不存在，其余 59 个清理候选摘要不变。

本目录附 red/Web/Router/types/lint/release 日志与文件 SHA-256 摘要。

## 发布边界与剩余事项

这是本地源码修复，不是生产验收。未构建新 Worker 或执行真实 Cloudflare/R2 操作。发布时仍须干净源码构建、同制品预览及生产验收，不复用历史制品作为本轮证明。

新命名空间会产生冷缓存和额外回源，旧对象继续占用存储。本批不删除历史对象。API URL 和既有一年 immutable 响应策略未改变，因此浏览器/CDN 已缓存的响应不会因为 R2 换键立即失效；未证实真实历史内容已碰撞，也不宣称已纠正所有客户端历史缓存。如后续发现实际受影响内容，须另行确定客户端 URL 版本化或经授权的定向缓存处理。

下一项为 F4：公开分享有效期与响应字段白名单。P1 的完整多 Worker 远程执行器仍属后续 S5，账号删除保持取消。
