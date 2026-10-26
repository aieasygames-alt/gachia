# F2 主站 URL 解码与规范化

日期：2026-10-25。基线：`334de6e`，工作区另含上一批 P1 入口封堵与已批准的文件清理，均保留。本批只修改 Main middleware、对应测试和任务记录；没有提交、推送、构建或生产部署。

## 修复

- 路径逐段解码一次。非法百分号/UTF-8、段内编码斜杠/反斜杠、控制字符、规范化后点路径返回 400，附 no-store 和 noindex；不抛出 URIError，不改变路由层级。
- 空白规范化后逐段重新编码，与编码态 pathname 比较；中文、字面百分号、保留字符不会产生自重定向或递归解码。
- 详情标签只在确实移除后缀时重定向，目标重新编码并排除点路径；不再因为原始编码与解码文本不同而误重定向。
- 重定向使用标准 URL，避免 NextURL.clone 保留原尾斜杠导致重定向回原地址；查询参数保持原样。
- 保留历史链接、退役页面和绿梦语言策略、Roco items notFound 边界、预览 noindex、正常页面安全头。

## 多 Worker 边界

没有修改 Router、所有权表、绑定、独立游戏 middleware 或发布配置。回归覆盖专属游戏路径保持原 owner、NTE item 详情仍归 Main，以及 Main 接收的编码游戏名规范化后交给现有 Router 重新判定。编码分隔符被拒绝而非转换成跨层路径。

测试直接调用真实 NextRequest/NextResponse 和真实 next-intl，不模拟国际化中间件。此验证不包含 CDN/Next HTTP matcher/云端 Worker 链路；middleware 未匹配的请求不在本修复承诺内。

## 验证

- 修复前回归：21 失败 / 390 通过，确认非法解码、自重定向等故障。初版修复后剩 1 个尾斜杠循环，已进一步修复。最终新增测试共 37 项。
- `pnpm --filter @gachia/web test`：79 文件、413 项通过。
- `pnpm --filter @gachia/router test`：35 项通过。
- `pnpm --filter @gachia/web type-check`：通过。
- `pnpm --filter @gachia/web lint`：0 error，保留既有 auth-dialog ref cleanup warning。
- `pnpm test:release`：Node 300、Python 31 项通过。
- `git diff --check`：通过。119 个旧浏览器记录仍删除，其余 59 个清理候选 SHA-256 不变。

本目录保存 red、Web、Router、类型、lint、发布合约日志及本批文件摘要。未复用历史构建作为新代码验收；未访问生产用户数据、未执行 Cloudflare 写入或清理 R2。新 Worker 构建、同制品预览与生产验收仍须发布时执行。下一项为 F3 地图瓦片缓存键碰撞，F4 分享有效期和输出白名单亦未完成。账号删除保持取消，登录开关未改变。
