# 工作台拟提交范围与保留限制

日期：2026-10-13。状态：审阅材料，未暂存、未提交，不是操作授权。

## 范围结论

162路径沿用v9候选；包含4配置、83源码/资源、68测试、7文档。无真实公告JSON数据改动。最终字节应以获得授权时重新核对为准，不照抄旧摘要。16.93修改server/workbench测试，16.94至16.95修改store/storage-recovery/workbench测试；两份任务文档也后置更新，v9回归不覆盖这6路径的当前字节。

10手动工具、历史工作台报告及4其他游戏报告不默认纳入。报告中机器路径/旧对象ID需另行审查，不能git add .。本文件是后续审阅材料，不属于原162候选，是否提交另定。

## 大模块边界结论

| 模块 | 已有有限证据 | 保留限制 |
|---|---|---|
| store | 逐版本迁移、事实/修订失效、同库预留、来源事务及合成恢复；16.95回滚失败连接拒绝全部导出读写，保留close | 非整体迁移原子；故障连接仍可能有未提交状态，禁止继续使用，需关闭后重新核对，不自动重试/重开；读取集合与SQLite耗时未全面硬限 |
| workspaces | HEAD/注册/JSON路径门禁、精确审核包、过期阻断 | 非OS沙箱，祖先路径并发替换不完全防护；Git工作区创建与数据库非单事务，未知状态保留对账 |
| application-preview | 明确非沙箱确认、独立Next路径、归属预留、停止及终态保存失败保守阻断 | 依赖制品未认证，真实代码仍可访问本机/网络；端口选择有时间窗，后代退出和不同库协调未证明 |
| public/app | textContent输出、鉴权API、审核包绑定、同按钮防重与state旧响应抑制 | 非跨客户端锁；历史查询旧错误通知、全部交互/辅助技术及超大页面尚未全面验证 |
| Web/Router | JSON-LD统一转义、弹窗owner及HI3分流夹具 | DOM交接不是全owner事件；真实Next搜索恢复未验；生成器非崩溃原子写入 |

上述不是全文件签发批准。不会仅为把fullyReviewed改成非零而消除未证实风险；下一阶段只修明确问题，必要时将真实验收缺口保留为独立门禁。

## 后续门禁

1. 本阶段限定差异/风险材料已整理，非完整语义批准；最新验证与字节关系见下表，普通修复可以继续，真实执行不自动获准。
2. 只有用户明确授权具体暂存/提交范围后才写索引和创建提交。
3. 新基线后重建限定Global三语JSON草案及镜像，不覆盖旧审核对象。
4. 独立依赖准备与非沙箱原草案执行另行确认；生产构建/预发布/上传切流/线上对账及正式发布继续单独门禁。

## 当前证据与授权边界（16.96）

| 材料 | 可以证明 | 不能证明 |
|---|---|---|
| baseline-closeout-regression-v9 | 原162候选运行前后摘要一致；管理端240、Web141、Router26、浏览器12/双宽、types与生成check4通过 | 后续6路径字节、原子全源码/依赖快照、生产构建 |
| store-fault-fence-review | 16.95当前存储保护与HTTP专项22、管理端243/255及浏览器12/双宽通过 | Web/Router重跑、全部SQLite/OS故障、真实草案 |
| final-handoff-check | 当前候选与原清单核对、限定凭据规则、旧证据漂移及Git状态观察 | 全文件安全认证或暂存字节批准 |

目前普通开发/测试阶段可以继续，但实际建立新Git基线、独立依赖准备、非沙箱原草案预览、正式构建/发布均未授权。泛称“继续下一步”不作为这些操作的授权，也不重复要求逐字段内容决定。若要建立基线，应明确授权本文件列明的162路径；本新增范围说明是否纳入需同时明确，历史报告和10手动工具不默认包含。执行前仍需核对精确差异和暂存字节；发现新的无关改动立即停止。

阶段交付是“已有候选实现、限定测试、风险与范围可追溯”，不是“全部产品完成”。未完成的真实验收保持明示，不通过反复刷新矩阵或提高fullyReviewed数字伪装解决。

## 列明的162候选路径

- `.gitignore`
- `apps/admin/package.json`
- `apps/router/package.json`
- `apps/web/app/[lang]/[game]/artifacts/[id]/page.tsx`
- `apps/web/app/[lang]/[game]/characters/[id]/aniimo-character-detail.tsx`
- `apps/web/app/[lang]/[game]/characters/[id]/character-detail-shared.tsx`
- `apps/web/app/[lang]/[game]/characters/page.tsx`
- `apps/web/app/[lang]/[game]/disk-sets/[id]/page.tsx`
- `apps/web/app/[lang]/[game]/drive-discs/[id]/page.tsx`
- `apps/web/app/[lang]/[game]/echoes/[id]/page.tsx`
- `apps/web/app/[lang]/[game]/guides/[slug]/page.tsx`
- `apps/web/app/[lang]/[game]/items/[id]/page.tsx`
- `apps/web/app/[lang]/[game]/items/page.tsx`
- `apps/web/app/[lang]/[game]/layout.tsx`
- `apps/web/app/[lang]/[game]/page.tsx`
- `apps/web/app/[lang]/[game]/s1-check/page.tsx`
- `apps/web/app/[lang]/[game]/version/page.tsx`
- `apps/web/app/[lang]/[game]/weapons/[id]/page.tsx`
- `apps/web/app/[lang]/[game]/weapons/page.tsx`
- `apps/web/app/[lang]/about/page.tsx`
- `apps/web/app/[lang]/content-verification/page.tsx`
- `apps/web/app/[lang]/page.tsx`
- `apps/web/app/[lang]/update-radar/page.tsx`
- `apps/web/components/auth/auth-dialog.tsx`
- `apps/web/components/layout/site-header.tsx`
- `apps/web/components/search/search-dialog.tsx`
- `apps/web/lib/seo-metadata.ts`
- `pnpm-lock.yaml`
- `scripts/generate-router-game-config.mjs`
- `apps/admin/README.md`
- `apps/admin/public/app.js`
- `apps/admin/public/index.html`
- `apps/admin/public/style.css`
- `apps/admin/src/affected-pages.mjs`
- `apps/admin/src/announcement-descriptions.mjs`
- `apps/admin/src/application-preview.mjs`
- `apps/admin/src/artifact-bytes.mjs`
- `apps/admin/src/baseline-inventory.mjs`
- `apps/admin/src/bounded-file.mjs`
- `apps/admin/src/cleanup-plan.mjs`
- `apps/admin/src/config-input.mjs`
- `apps/admin/src/content.mjs`
- `apps/admin/src/data-preview.mjs`
- `apps/admin/src/data-quality.mjs`
- `apps/admin/src/dependency-plan.mjs`
- `apps/admin/src/deployment-diagnostics.mjs`
- `apps/admin/src/discovery-checks.mjs`
- `apps/admin/src/draft-reviews.mjs`
- `apps/admin/src/draft-validation.mjs`
- `apps/admin/src/execution-dependencies.mjs`
- `apps/admin/src/execution-inputs.mjs`
- `apps/admin/src/execution-intents.mjs`
- `apps/admin/src/execution-material.mjs`
- `apps/admin/src/execution-policy.mjs`
- `apps/admin/src/execution-protocol.mjs`
- `apps/admin/src/facts.mjs`
- `apps/admin/src/import-audit.mjs`
- `apps/admin/src/isolation-integration.mjs`
- `apps/admin/src/mac-runtime-discovery.mjs`
- `apps/admin/src/official-source.mjs`
- `apps/admin/src/preview-baseline.mjs`
- `apps/admin/src/preview-readiness.mjs`
- `apps/admin/src/release-plan.mjs`
- `apps/admin/src/review-identity.mjs`
- `apps/admin/src/review-preparation.mjs`
- `apps/admin/src/revisions.mjs`
- `apps/admin/src/runtime-inspect-adapter.mjs`
- `apps/admin/src/runtime-inspect-session.mjs`
- `apps/admin/src/runtime-inspection.mjs`
- `apps/admin/src/runtime-settings.mjs`
- `apps/admin/src/search-interactions.mjs`
- `apps/admin/src/server.mjs`
- `apps/admin/src/source-history-query.mjs`
- `apps/admin/src/staging-contract.mjs`
- `apps/admin/src/storage-files.mjs`
- `apps/admin/src/storage-health.mjs`
- `apps/admin/src/storage-lifecycle.mjs`
- `apps/admin/src/store.mjs`
- `apps/admin/src/workspaces.mjs`
- `apps/admin/tests/affected-pages.test.mjs`
- `apps/admin/tests/announcement-descriptions.test.mjs`
- `apps/admin/tests/application-preview.test.mjs`
- `apps/admin/tests/artifact-bytes.test.mjs`
- `apps/admin/tests/auth-dialog-react.test.mjs`
- `apps/admin/tests/baseline-inventory.test.mjs`
- `apps/admin/tests/bounded-file.test.mjs`
- `apps/admin/tests/browser-smoke.mjs`
- `apps/admin/tests/cleanup-plan.test.mjs`
- `apps/admin/tests/config-input.test.mjs`
- `apps/admin/tests/data-preview.test.mjs`
- `apps/admin/tests/data-quality.test.mjs`
- `apps/admin/tests/dependency-plan.test.mjs`
- `apps/admin/tests/deployment-diagnostics.test.mjs`
- `apps/admin/tests/discovery-checks.test.mjs`
- `apps/admin/tests/draft-validation.test.mjs`
- `apps/admin/tests/execution-dependencies.test.mjs`
- `apps/admin/tests/execution-inputs.test.mjs`
- `apps/admin/tests/execution-intents.test.mjs`
- `apps/admin/tests/execution-material.test.mjs`
- `apps/admin/tests/execution-policy.test.mjs`
- `apps/admin/tests/execution-protocol.test.mjs`
- `apps/admin/tests/facts.test.mjs`
- `apps/admin/tests/import-audit.test.mjs`
- `apps/admin/tests/isolation-integration.test.mjs`
- `apps/admin/tests/mac-runtime-discovery.test.mjs`
- `apps/admin/tests/manual-tool-gates.test.mjs`
- `apps/admin/tests/modal-background.test.mjs`
- `apps/admin/tests/official-network.test.mjs`
- `apps/admin/tests/official-source.test.mjs`
- `apps/admin/tests/planning-diagnostics.test.mjs`
- `apps/admin/tests/preview-baseline.test.mjs`
- `apps/admin/tests/preview-occupancy-browser.test.mjs`
- `apps/admin/tests/preview-readiness.test.mjs`
- `apps/admin/tests/preview-reservation.test.mjs`
- `apps/admin/tests/quality-field-coverage.test.mjs`
- `apps/admin/tests/quality-id-integrity.test.mjs`
- `apps/admin/tests/quality-input-budget.test.mjs`
- `apps/admin/tests/quality-traversal.test.mjs`
- `apps/admin/tests/recovery-draft-tables.test.mjs`
- `apps/admin/tests/review-identity.test.mjs`
- `apps/admin/tests/review-preparation.test.mjs`
- `apps/admin/tests/revisions.test.mjs`
- `apps/admin/tests/router-generation.test.mjs`
- `apps/admin/tests/runtime-inspect-adapter.test.mjs`
- `apps/admin/tests/runtime-inspect-session.test.mjs`
- `apps/admin/tests/runtime-inspection.test.mjs`
- `apps/admin/tests/runtime-settings.test.mjs`
- `apps/admin/tests/search-interactions.test.mjs`
- `apps/admin/tests/search-loader-react.test.mjs`
- `apps/admin/tests/search-recovery-smoke.mjs`
- `apps/admin/tests/source-history.test.mjs`
- `apps/admin/tests/source-lock.test.mjs`
- `apps/admin/tests/staging-contract.test.mjs`
- `apps/admin/tests/storage-files.test.mjs`
- `apps/admin/tests/storage-health.test.mjs`
- `apps/admin/tests/storage-recovery.test.mjs`
- `apps/admin/tests/workbench.test.mjs`
- `apps/admin/tests/workspaces.test.mjs`
- `apps/router/src/hi3-routing.test.ts`
- `apps/web/__tests__/hi3-og-fallback.test.ts`
- `apps/web/__tests__/hi3-weapon-navigation.test.ts`
- `apps/web/__tests__/hi3-weapon-scope.test.ts`
- `apps/web/__tests__/jsonld-script.test.ts`
- `apps/web/__tests__/search-dataset.test.ts`
- `apps/web/__tests__/search-loader-visibility.test.ts`
- `apps/web/__tests__/search-module.test.ts`
- `apps/web/__tests__/search-trigger-accessibility.test.ts`
- `apps/web/components/search/search-loader.tsx`
- `apps/web/lib/hi3-weapon-scope.ts`
- `apps/web/lib/jsonld-script.ts`
- `apps/web/lib/modal-background.ts`
- `apps/web/lib/search-dataset.ts`
- `apps/web/lib/search-keyboard.ts`
- `apps/web/lib/search-module.ts`
- `apps/web/public/images/og/hi3.webp`
- `docs/hi3-real-announcement-review.md`
- `docs/hi3-source-intake-decisions.md`
- `docs/local-game-content-workbench.md`
- `plans/workbench-baseline-closeout.md`
- `plans/workbench-execution-isolation.md`
- `plans/workbench-manual-materials.md`
- `scripts/router-config-files.mjs`
