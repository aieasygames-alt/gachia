# F4 公开分享读取边界

日期：2026-10-26。基线：`334de6e`。保留之前的 P1、F2、F3 与文件清理变更。本轮未提交、推送、构建、部署或操作生产数据。

## 修复

- 新增 `apps/web/lib/public-shared-builds.ts`，API 和分享页面共用一个读取器。数据库读取完成后检查有效期：null 为永久；未来时间可读；已到期（包括等于当前时间）及无效 Date 均不可读。
- 查询显式投影 id、gameId、characterId、buildData、createdAt、expiresAt，不读取 userId/viewCount。公开 DTO 再显式投影前五个字段，不输出 expiresAt 或未来新增内部字段。
- API 对过期和不存在记录均返回 404；页面调用 notFound，且拒绝 URL 游戏与分享记录游戏不一致的请求。
- 页面非队伍 JSON 展示也只使用公开 DTO。buildData 是原有用户主动分享的内容，仍按原格式保留；本修复不是对其中任意自填文本的敏感信息识别或清理。
- API/页面标记 force-dynamic，API 成功/缺少参数/不存在响应均 no-store。Main middleware 对分享页不再添加公共 TTL，而设置 no-store，其他页面缓存策略保持不变。
- 选择不缓存，而非根据剩余寿命计算 TTL，避免 stale-while-revalidate 超过到期点；代价是每次到源请求均查库。此前生成或已下发的缓存不会被新响应头追溯撤销。
- POST、登录开关、数据库 schema、历史记录不变；没有删除、迁移或恢复数据。Router 和独立 Worker 不变，分享路径仍遵守现有 Main 所有权规则。

## 验证

新增 11 项回归，使用真实 API handler、页面函数和 React 静态渲染、真实 middleware/next-intl，数据库与 UI 依赖为替身。覆盖到期前/恰到期/已过期/无效日期、永久记录、数据库延迟、后续请求到期、字段白名单、查询投影、跨游戏拒绝、404/400、页面动态与缓存策略，以及多 Worker 游戏分享路径所有权。已有账号关闭测试仍确认创建被阻断、有效历史分享可读。

- `pnpm --filter @gachia/web test`：81 文件、438 项通过。
- `pnpm --filter @gachia/router test`：35 项通过。
- Web type-check：通过；lint：0 error、1 条既有 auth-dialog ref cleanup warning。
- `pnpm test:release`：Node 300、Python 31 项通过。
- `git diff --check`：通过。119 份已批准删除记录仍不存在，59 份保留候选摘要不变。

初次测试因 Next tsconfig 的 JSX preserve 导致 Vite 无法加载页面，未执行用例，不能算修复前红测证据（见 initial-jsx-error.log）。Vitest 配置现显式使用 automatic JSX 转换，真实 TSX 页面可进入行为测试；此配置只影响测试，不改变 Next 构建设置。原始功能故障证据仍见 `reports/project-reaudit-2026-10-25/`。本目录保存最终测试日志与源码摘要。

## 剩余边界

没有读取真实分享、不知道线上是否存在过期记录；没有缓存清除。数据库 SQL 实际 D1 执行、Next/OpenNext HTTP 响应头合并与 CDN 行为尚须新制品发布门禁验证。本地直接调用与渲染不等于真实 Worker/浏览器验收。

F1–F4 均已有本地处理，但未提交部署；P1 完整多 Worker 远程执行器仍属 S5。下一步应复核累积差异、构建和发布门禁，再按授权完成 Git/生产交付，不重复处理已修复项，也不把长期 S3–S8 宣称为完成。
