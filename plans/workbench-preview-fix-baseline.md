# 原草案预览发现项：最小基线同步方案

日期：2026-10-13。状态：开发修复及函数测试完成，未暂存/提交。

## 两个修复组（精确产品路径）

1. 依赖安装后工作区检查超限：apps/admin/src/workspaces.mjs、apps/admin/tests/workspaces.test.mjs。Git先排除已有允许依赖/构建目录再进行有界输出，9000长路径夹具仍拒绝其他ignored文件；管理端244/256、浏览器12/双宽见dependency-listing-boundary-review。
2. HI3社交metadata遗漏：apps/web/app/[lang]/[game]/weapons/page.tsx、apps/web/app/[lang]/[game]/weapons/[id]/page.tsx、apps/web/__tests__/hi3-weapon-scope.test.ts、apps/web/__tests__/weapon-metadata-behavior.test.ts。只HI3显式Twitter边界与1024方形OG，其他游戏保留原行为；实际执行generateMetadata的9项三语/非HI3/缺实体用例通过，Web150/types通过，不等同修复后Next渲染。

产品代码/测试共6路径，不夹带游戏JSON、node_modules、一次性脚本或历史报告。docs/local-game-content-workbench.md、plans/workbench-baseline-closeout.md为阶段状态更新；plans/workbench-independent-dependency-preparation.md和本文为另列新增方案，是否纳入后续提交须明确授权，不能把旧163文件提交授权复用。

## 当前真实验收事实

旧应用基线074b110原草案12个案例的两武器三语/双宽点击及description/OG/scope/JSON-LD通过；Twitter12处错误是失败发现，不得删除。修复只在主目录，未绕过JSON白名单复制到旧草案。依赖安装/非沙箱预览授权不授予新Git提交、生产构建或发布。

## 推荐下一步

1. 明确授权上述6产品路径与选定状态/方案文档的本地提交，不推送；执行前固定字节、检查暂存范围并回归。
2. 新基线后新建独立草案与新审核对象，只重放已核验六描述；不覆盖旧stage/审核/报告，不把旧依赖制品默认为新对象已验证。
3. 新对象独立依赖准备须明确范围并复核授权，固定锁/平台/布局；不得借用主目录依赖或无审查搬运旧node_modules。
4. 获得适用于新对象的非沙箱执行授权后，重新验收Twitter/OG/head的真实输出及两武器搜索流程，旧失败报告保留；全部生产操作继续独立门禁。

完成条件是新基线真实页面修复验证，而不是仅测试字符串存在或覆盖旧报告。当前旧草案可追溯但不满足全部metadata检查；正式本地化/客户端效果/所有页面及生产闭环仍未完成。
