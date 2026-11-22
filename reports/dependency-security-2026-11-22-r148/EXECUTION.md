# R148：剩余依赖安全修复及主站单 Worker 发布完成

Better Auth/core/adapter/telemetry 已从 **1.6.22 → 1.7.7**，qs **6.16.1**、glob **14.0.2**、minimatch **11.0.1** 已锁定。17 个新增或升级的官方 tarball integrity 已验证；本次全仓、生产依赖及独立 CMS 当前公告扫描均为 **0**，没有 ignore 或隐藏告警。CMS 的旧 deepmerge 公告已于 2026-11-16 被官方撤回，不是本批依赖升级；原风险记录已补充官方复核。账号功能保持关闭，未执行公网账号登录或 auth 数据库迁移。

主站正式版本 **`906927ee-9d4f-44c4-a464-14939e85c84b`**，deployment **`c1a83c34-9431-4c99-8ae9-5e6e9f08ad5e`**，100% 流量；兼容恢复 **`342b711e-e2b8-471d-bdca-b99046b9f5df`** 已验收，未真实回滚。精确实现/编译/执行源码 **`721d1596885244aed46aab869ad4b943cd9f66f7`** 的[完整 CI 44972438569](https://github.com/aieasygames-alt/gachia/actions/runs/44972438569)成功。Next 15.5.29、OpenNext 1.20.13、Wrangler 4.148.0 及 deferred-initial patch 保持；四个游戏、Router、四个 staging 和 R147 常驻 CMS 安装保持。

五个应用均用冻结的正式 R146 内容完成标准 OpenNext 构建，449 份公开 JSON 清单、值与字节 SHA256 全部保持。600 项 Web、44 项聚焦 auth、4 项工具链安全/兼容测试、20 项来源合同、全公开消费者类型和发布工具测试通过；glob promise/stream 中止后不再继续读取，真实 node-minify/ESLint 与 qs 异常输入均验证。首次工具链测试调用 node-minify 导出方式错误，已修正测试为其真实函数入口后通过；原失败日志保留，没有修改上游实现。CMS 只读捕获脚本初次相对路径错误在登录前停止，修正后通过，原失败日志保留。

候选/恢复本机 HTTP **2155/2155** 项、聚合 **740** 项，18 个桌面/手机、三语、有/无 JavaScript 和延迟脚本浏览器场景通过。候选/恢复精确 UUID 云预览 **2155/2155** 项及切流前同规模复验通过；正式 Main **334** 项和聚合 **740** 项通过。本机聚合使用精确已发布 Router 模块的 HTTP binding bridge 调用真实 workerd，没有声称 Router 自身在 workerd 执行。账号禁用接口在本机候选/恢复、云候选/恢复和正式站均验证；没有创建/刷新公网账号 cookie。

实际已发布模块包含 Better Auth 1.7.7，旧 1.6.22 版本标识消失；恢复模块与发布前 Main 精确摘要一致，并保留新旧静态资源。内容来源 115 份完全保持，胡桃、异环/Zero/27 材料与 441 引用删除状态、攻略增量和 R143 完整集合保留。真实 CMS 2,966 条 draft/published 经稳定双读仍与 R144 AFTER 一致。**本批 0 CMS 内容/审核写入、0 编辑源同步、0 schema 迁移、2 个 Main 版本上传、1 次 Main 正式部署。**

唯一正式接续入口：[published-sources/source-index.json](published-sources/source-index.json)，pin **`e364a23c8e9635db8e06344ff11980f25ef6a14fe87a7a6856a58523ea87957b`**。真实工作区读取器已重开 115 来源、五 owner，allOwnersCurrent=true。CMS 编辑源继续 [R144 AFTER](../genshin-editing-source-sync-2026-11-21-r144/cms-final.json.gz)，pin `b25b29e1fc523c767252e4059cb9ba8d7574be651b08b783002f9096a9cfaf20`，不得重放既有写入或 R148 部署。

五份构建制品各 19 条符号链接均在制品内部且可解析；正式来源推进后只清理本批可再生成的依赖/构建缓存，冻结源码、115 来源和派生清单再次验证保持。详见 artifact-portability.json、cleanup.json、cleanup-source-verification.json；候选、恢复与全部发布证据保留。

R147 常驻 CMS 的旧来源合同尚不识别本次 Main 专用依赖升级 policy；直接调用已安装合同已确认拒绝，详见 installed-reader-boundary.json。这是下一批的安装任务，不能用工作区通过冒充已安装版已接通。下一批安装已通过 CI 的新合同，保持内容、审核、媒体、依赖和应用恢复能力；无需重发任何公开内容。绿梦保持中文。可用约 **13.43 GiB**；后续完整游戏构建继续 14 GiB 标准、8 GiB 保留线。
