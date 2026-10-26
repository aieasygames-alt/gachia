# 移动端 sticky 导航叠字修复（2026-10-26）

结论：P2 已完成本地修复与回归，尚未提交或部署；不能据此标记线上问题已关闭。基线为发布工作树的 `71d7851`，延续独立线上复验的发现，不改写其原始结果。

后续执行：用户继续下一步后，另补 staging/production 的正式视觉门禁及发布契约测试。此处“尚未提交/部署”和“无须改变 CI workflow”描述本地修复阶段；最新发布进展以 `reports/mobile-header-release-2026-10-26/README.md` 为准。

## 根因与修复

- Main 的 `SiteHeader` 将两行导航一起 sticky，但只有第一行有 `bg-game-bg/90` 与 backdrop blur；外层和移动端游戏行均透明，正文滚过后透出。
- 仅为整个 header 增加 `bg-game-bg lg:bg-transparent`：小于 1024px 时，两行及换行区域、行间空隙和容器外侧都有不透明底色；1024px 起恢复原来的透明外层，桌面第一行仍沿用原来的半透明背景与模糊效果。
- 不改变高度、sticky 定位、层级、断点、游戏链接、语言切换、搜索或账号开关，不修改独立游戏 Worker 的 header。

## 回归方式

新增 `tests/browser/sticky-header.spec.ts`，自动包含在现有 `pnpm test:browser` 中，无须改变 CI workflow。

1. 在未修复代码上先执行 390px 中文正常脚本场景，稳定失败于 `content must not show through either mobile header row`，而不是只做源码字符串断言。
2. 每场景保存顶部、滚动 120px、详情返回列表后再滚动的实际视口截图；同时检查 sticky 顶部位置、页面横向溢出、列表/详情/返回链路。
3. 对小于 1024px 的场景确认正文实际位于游戏导航下方，再临时将正文背景在洋红与青色之间切换，比较整个 header 的 PNG 像素。底色变化不得改变 header 像素，检测范围包括第一行、游戏行及留白；探针结束后恢复正文原样。该断言覆盖 CSS 实际绘制，不依赖机器间截图基线。
4. 延迟脚本场景先扣住全部同源 JS，在搜索仍禁用时完成截图与滚动绘制检查，然后释放脚本，等待交互就绪并验证详情/返回；无 JS 场景走原生链接与浏览器返回。
5. 阻止第三方请求及账号相关请求，并断言没有账号请求、运行时异常或意外 JS/CSS 加载失败。Chromium 在禁用 JS 时对脚本 preload 报出的 `csp` 拒绝属于测试预期，不计作资源故障；HTTP 错误、样式失败及其他脚本失败仍会报错。

## 本次结果

| 检查 | 结果 |
|---|---|
| 开发模式新浏览器回归 | 42/42，通过；其中 21 个场景分别使用 desktop/mobile 两种 Chromium 模拟配置 |
| 本地生产模式新浏览器回归 | 42/42，通过，0 跳过、0 重试、0 flaky；见 `browser-summary.json` |
| 390×900 核心矩阵 | 中文/英文/日文 × 正常/延迟脚本/无 JS × 两种模拟配置，共 18 场景 |
| 补充断点矩阵 | 768、1023、1024、1440px × 三语言 × 两种模拟配置，共 24 场景；正常脚本模式 |
| 既有导航浏览器回归 | 本地生产模式 16/16；跨 owner 测试使用既有响应 fixture，不代表真实多 Worker 部署验收 |
| Web 单元/契约测试 | 81 文件、438/438 测试通过 |
| 类型与静态检查 | Web type-check、新浏览器测试独立 TypeScript 检查、修改组件 ESLint 通过 |
| Next.js 生产构建 | 通过；保留已有 `auth-dialog.tsx` ref cleanup warning，本次不改动该组件 |

截图复核了 390px 中文滚动与返回列表、1023px 日文及 1440px 桌面：移动端游戏导航下不再透出正文，断点前后导航正常。截图是本地生产模式结果，不是生产站修复后的截图；也不是对全站视觉质量的穷举。

保留截图：

- `mobile-top.png`、`mobile-scrolled.png`、`mobile-returned-list.png`：390px 中文，mobile 模拟（DPR 3，PNG 1170×2700）。
- `tablet-ja-top.png`、`tablet-ja-scrolled.png`、`tablet-ja-returned-list.png`：1023px 日文，desktop 模拟。
- `desktop-top.png`、`desktop-scrolled.png`、`desktop-returned-list.png`：1440px 中文，desktop 模拟。

原始日志、完整浏览器 JSON（含每场景截图）、修复前失败证据位于忽略目录 `.release-records/mobile-header-fix-2026-10-26/`。可追溯摘要见 `verification-summary.json`。

## 复跑入口

使用 Node 22，在仓库根目录运行：

```sh
pnpm --filter @gachia/web build
pnpm --filter @gachia/web exec next start --hostname 127.0.0.1 --port 3100
```

另一个终端运行：

```sh
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 pnpm exec playwright test tests/browser/sticky-header.spec.ts tests/browser/navigation.spec.ts --workers=2 --output=.release-records/mobile-header-fix-2026-10-26/rerun
pnpm --filter @gachia/web test
pnpm --filter @gachia/web type-check
pnpm exec tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --skipLibCheck tests/browser/sticky-header.spec.ts
```

## 剩余边界

- 本轮是本地 Next.js 开发/生产模式验证，没有新跑 OpenNext/Worker 打包、staging 或公网验收，没有提交、推送、触发 Actions、部署或清缓存。后续仍须走 Main 的受控发布门禁，并对新生产版本独立复验后再关闭线上 P2。
- 没有执行真实账号操作、读取真实分享或 R2 数据；账号功能保持关闭，账号删除保持取消。
- 编码 NUL 与点段路径的公网入口契约差异仍待单独定位/明确，本补丁不涉及 middleware 或 Cloudflare 配置，不把这两项标记为已解决。
- 仅对 Main 崩坏 3 武器列表/详情执行上述新增视觉断言，使用 Chromium 模拟而非真实 iOS/Safari；不声称全站、所有浏览器或长期全球节点稳定性通过。
