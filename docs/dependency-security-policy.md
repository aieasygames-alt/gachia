# 依赖安全升级与兼容边界

2026-10-25，本地候选。依赖扫描结果是当日注册表公告匹配，不是永久无漏洞或已上线证明。

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

本批保持 Next 15.5.28/OpenNext 1.20.13 及 deferred-initial 补丁，不恢复账号功能。仅消除编译类型依赖的 peer 冲突，不修改 Router 的路由行为。
