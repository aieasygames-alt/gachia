# 依赖安全升级与兼容边界

最近升级：2026-11-22 R148。依赖扫描结果是当日注册表公告匹配，不是永久无漏洞或已上线证明。公开站 Next 15.5.29、OpenNext 1.20.13 和 deferred-initial 补丁保持。

## Zod 4

core/data 直接声明 Zod 4.6.6，传递的 Zod 4 分支也固定到同一修复版本。不通过 audit ignore 或改写告警范围隐藏旧 Zod 3。

Zod 4 的 `record(enum, value)` 要求所有枚举键存在。项目原契约允许缺少翻译，因此使用共享 `LocalizedTextSchema = z.partialRecord(SupportedLocaleSchema, z.string())`，而不是补造空翻译或强制修改所有内容。未知语言键和非字符串翻译仍拒绝。

六项兼容测试在升级前后的两版均执行，覆盖部分翻译、未知字段裁剪、技能扩展字段、可选字段、两种角色属性格式、嵌套翻译、枚举和 flatten 错误接口。真实数据 validate 也在升级前后通过。Zod 4 更严格的有限数字/安全整数检查未被关闭；既有数值数据通过，不承诺异常输入的错误文案逐字不变。

## Drizzle Kit 与旧 esbuild

Drizzle Kit 固定为 0.31.11。其已发布 JS/CJS/MJS 未引用 `@esbuild-kit/esm-loader`，实际 TypeScript 加载已使用 tsx，但包元数据仍声明了废弃 loader，导致引入 esbuild 0.18.20。

使用仅针对该确切版本的 pnpm 边删除：

```json
{"drizzle-kit@0.31.11>@esbuild-kit/esm-loader": "-"}
```

这不是忽略公告，也不是将旧 loader 的 esbuild 强行跨 0.x 升级。锁文件不再包含该依赖链；本地旧 pnpm 缓存中可能仍有未被引用的文件，不能以缓存目录存在判断它仍属于可复现依赖图。

`scripts/db-toolchain.test.mjs` 固定版本并检查发布文件不引用该 loader。在临时目录运行真实 Drizzle CLI，额外拦截所有 `@esbuild-kit/*` 模块请求；使用本项目三个 schema 源生成 SQL，在内存 SQLite 中验证九张表，再次生成确认没有迁移变化。没有生产数据库连接、迁移执行、凭据或真实用户数据。

将来升级 Drizzle Kit 时，这个精确版本 override 不会自动套到新版。必须重新核查依赖、源码与 CLI 行为，并更新测试；上游删除废弃声明后移除 override。

## 构建与发布工具链

同主版本分支的 overrides 覆盖 PostCSS、nanoid 3、source-map-js、glob 10、brace-expansion 1/2/5、form-data 4、ws 7、undici 7、js-yaml 4、qs 6、proxy-addr 2、body-parser 2 的公告修复版本。不要在后续安装时删掉这些约束而只检查直接依赖。

sharp 升至 0.35.5 是需要额外验证的原生依赖升级。`scripts/image-toolchain.test.mjs` 验证实际安装版本、合成像素的 PNG/WebP/AVIF 编解码及小型 SVG 栅格化，不下载外部图片。这是功能回归，不是漏洞利用测试或无限输入安全证明。

两组工具链测试加入 `pnpm test:release`，现有 CI 会执行该入口。本轮没有更改 CI 工作流或实际触发 Actions。

## 本地发布前检查

- 分别执行 `pnpm audit --prod --json` 和 `pnpm audit --json`，保存各自范围；不得用前者冒充包含开发工具的完整扫描。
- 冻结锁文件安装、全包类型检查、数据/发布/工作台测试。
- 五应用 OpenNext 构建、Wrangler dry-run、制品链接可移植性检查。
- 隔离本地 Worker HTTP、桌面/手机、三语言、延迟脚本/无 JavaScript、搜索/内容/SEO 回归；保留各套脚本自己的范围限制。
- 生产切换、旧资源保留、实际云端环境与回滚版本仍按既有发布门禁执行，不能由本地成功替代。

2026-10-25 当批保持 Next 15.5.28/OpenNext 1.20.13 及 deferred-initial 补丁，不恢复账号功能。仅消除编译类型依赖的 peer 冲突，不修改 Router 的路由行为。

## R148：Better Auth 与共享工具链

Better Auth 从 1.6.22 精确升级至 1.7.7，其 core、adapter 和 telemetry 同步为上游要求的 1.7.7。官方 registry 已发布这些版本，GitHub 四类公告的修复范围均满足；Next/React/Drizzle peer 范围保持兼容。账号开关继续关闭，不运行公网账号或数据库迁移。

qs 6 固定为 6.16.1。glob 10/13 的上游分支没有本次中止绕过修复，定向升级为 14.0.2；glob 14 的 minimatch 边固定 11.0.1，TypeScript ESLint 的 minimatch 10 分支同样升级为 11.0.1。ESLint 原有的 minimatch 3.1.5 不受该公告影响，保持原 CommonJS 接口。所有其他 override 和 Next patch 保留，没有 ignore 或删除审计记录。

`scripts/security-toolchain.test.mjs` 经实际依赖路径验证 OpenNext tracing、node-minify 文件合并、glob promise/stream 中止后不继续读取、qs comma 数组异常输入及普通往返、TypeScript ESLint 匹配与真实解析。测试进入 `pnpm test:release`。根工作区 audit 的 all/prod 和独立 CMS audit 分别保存；R148 修复后的本地结果均为 0 公告，不能据此推定先前发布模块已升级。

Better Auth 只由 Main 直接引用，当前发布模块仍包含旧版本；因此正式更新目标仅为 Main。四个游戏、Router 和 CMS 包定义不变。工具链跨主版本变化需要五应用 OpenNext 构建验收，但不要求重发四个游戏；CMS 不需要重新安装依赖。
