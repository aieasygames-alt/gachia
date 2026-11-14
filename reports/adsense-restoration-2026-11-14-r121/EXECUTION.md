# R121 AdSense 恢复与磁盘清理完成回执

2026-11-14，用户授权的两项工作均已完成：AdSense 正式恢复，批准清单内的旧依赖与构建缓存完成清理。本次为五站点广告基础设施发布；R120 异环日常单 Worker 发布资格保留。

## 正式结果

Main、原神、异环、蓝色星原、绿梦均已正式切至新版本，公网逐 owner 验收通过；Router 与 staging 部署版本保持。新生产版本如下：

| Worker | 版本 UUID |
|---|---|
| `gachia-game-genshin` | `2fcd8859-5881-4dbc-aa9c-0b9d558ff8bc` |
| `gachia-game-nte` | `a95ee8e7-83c3-420e-9b48-64ed97dd77a2` |
| `gachia-game-azur-promilia` | `7976c792-c35c-402e-adb3-8909bbe6a2e9` |
| `gachia-game-lvmeng` | `6876b36b-c74c-41cb-aeff-1639c3ba0077` |
| `gachia` | `316dab91-b549-40f1-943a-0732339230dd` |

完整不可变完成证据：[production completion](run-08/completion.json)、[生产 journal](run-08/production.jsonl)、[最终交付摘要](delivery.json)。后续 `STATUS.json` 为本次完成状态。早期停止准备和 `binding-overlay.json` 的停止描述保留为历史，不代表当前部署状态。

## 广告实现与真实浏览器验收

共用 `packages/ui/adsense.tsx` 接入五站点布局；Google 发布商为 `ca-pub-8569630257520732`。只在 production 且域名为 `https://gachia.com` 时显示广告偏好，使用独立 `gachia.ads.v1` 选择。明确允许后才加载 SDK；此前 Analytics 选择不会自动允许广告。拒绝、撤回、存储不可用和非正式域名保持关闭；撤回通过重新加载终止运行中的 SDK。三语隐私说明已同步。

AdSense 后台核对站点准备就绪、自动广告启用；Google 已识别 ads.txt。`https://gachia.com/ads.txt` 返回 HTTP 200 和正确 DIRECT 授权。

Chrome 正式站验收记录见 [browser-checks.json](browser/browser-checks.json)：

| 页面 | SDK 数量（允许后） | 本次观察到 filled 广告位 |
|---|---:|---:|
| 原神胡桃英文详情 | 1 | 3 |
| 异环娜娜莉英文详情 | 1 | 2 |
| 蓝色星原 Abby 英文详情 | 1 | 2 |
| 绿梦中文首页 | 1 | 1 |
| 主站英文首页 | 1 | 1 |

默认未选择、拒绝后均为 0 个 SDK。异环撤回后重新加载，SDK、广告位与 `Advertisement` iframe 均为 0；重新允许后 SDK 恢复为 1，并再次观察到 filled 广告位。未点击任何广告创意。部分广告位本次为 unfilled；上述数字是本次会话观察，不保证每次访问的填充数量。绿梦第一次导航临时连接关闭，页面重载后成功；失败事实保留在执行上下文。

截图：[异环实际广告](browser/nte-filled.jpg)、[原神实际广告](browser/genshin-filled.jpg)、[主站实际广告](browser/main-filled.jpg)、[异环撤回后](browser/nte-withdrawn.jpg)。Chrome 自动翻译将部分英文界面显示为中文，公开内容本身由 HTTP 合同单独验证。

## 源码、构建与验证边界

最终验证提交为 `b92970110fc00e49b142f3d755e464d5b9937bf8`，完整 [CI 43556200927](https://github.com/aieasygames-alt/gachia/actions/runs/43556200927) 成功，要求步骤均执行；来源读取器图片 preload 比较相关 27 项测试通过。前一应用来源提交 `b1c7b4dab219727ec55c1c174fb134feb6d4b81e` 的完整 CI 43552303686 也通过。

实际完整应用编译在 `827b266035697218a27880f5d1480446ce9814d6` 完成。后续复用相同应用输入和 artifact，并冻结重新覆盖、逐份核对 115 来源；没有声称在最终提交重新完整编译。构建复用、操作器身份和物理编译提交见 [binding overlay](binding-overlay.json) 与 [最终复用证明](run-08/application-build-reuse-final.json)。正式 Main 使用 `sealed-bindings02/main` 的正确配置，其余四站使用 `sealed`。

五站候选与兼容恢复各自通过云预览，共 10 个模块和 6,290 次 HTTP；云模块、HTTP 响应和全部来源再次重开核对通过，见 [预览重开证明](run-08/preview-evidence-reopened.json)。正式逐 owner 公网验收通过；额外公共汇总在发布前后各通过 96 项检查，见 [before](run-08/global-public-before-02/result.json)、[after](run-08/global-public-after-02/result.json)。这些检查覆盖 raw aliases、聚合/search JSON、来源专用 raw-image-sources 404/no-store，以及 Router robots/sitemap 原值保持。

Main 原神、异环内容服务绑定从 R120 pinned baseline 精确保留。早期漏带绑定的未使用恢复版本 `b159b8e5-d357-4613-96f9-832ec9421eee` 被校验拦截，从未切换，禁止用作恢复。控制面修复证明见 [main-binding-repaired.json](run-08/main-binding-repaired.json)；正确 Main 恢复版本为 `fd6374dc-8aef-469a-82db-edbaa0710228`。本批恢复已云预览，未执行生产回滚。

HTML 比较使用既有 `rendered-image-preloads-v1`：仅容许指向同一已渲染 img src、属性受限的冗余图片 preload 差异；正文、图片、链接、样式、元数据与 JSON 值仍受保护。Router 根 SEO 路径、聚合和搜索按真实所属单独验收，不与 Main-only 输出混比。

## 来源接续与下一批

新来源：[sources-01/source-index.json](sources-01/source-index.json)

- 种类：`nte_adsense_infrastructure_source_index`
- SHA256：`1cf398fc545237a5f2cea5866c4cef0491a7f05f4b3bd9fe45f4374bf2bb4b36`
- 父来源：R120 `independent-sources-01/source-index.json`，pin `38a0a15fcc02cdc891ccf7339db49183bcb1b5f9e5c9cc45c9032df6bbf4d659`。
- 完整真实 `readNteSourceIndex` 重读通过：115 来源、5 owner、11 层祖先，耗时 93.179 秒；见 [source-readback.json](source-readback.json)。
- 胡桃、娜娜莉已上线文本，以及 ananta/genshin/hi3/nte/sea 五份攻略增量保留。本次没有真实 CMS 内容编辑。

下一批从 [source-result.json](source-result.json) 的 path/pin 调用 `readNteSourceIndex`，推进蓝色星原独立 CMS 正式发布。顺序仍为蓝色星原 → 绿梦中文 → 按内容类型扩展所有游戏 → 页面内联内容 → 新增、撤回和媒体替换。本批未开始蓝色星原内容发布实施。

## 磁盘清理

原批准清单内 23 个目录全部删除：原 Documents checkout 的根 node_modules，以及 `account-deletion-release`、`multi-game-s1-release-safety` 的依赖和五应用 `.next/.open-next`。删除前确认精确 allowlist、非 symlink、无 Git tracked 文件。真实可用空间由 14.624 GiB 增至 17.796 GiB，**释放 3.172 GiB**；原 du 估算 7.32 GiB 未用作真实释放量。

清理凭据见 [cleanup-result.json](../site-ads-storage-audit-2026-11-14/cleanup-result.json)。本轮停止准备的六份源码和三份相同构建经归档、逐文件核对后移除展开副本；重复 Main artifact 和 built 缓存也经树摘要核对后清除，归档和清理 intent/result 全部保留。它们属于本轮产生再清除的临时数据，不计入上面的旧缓存净释放量。

发布后最终记录可用 **14.72 GiB**，高于 14 GiB 标准构建预算，8 GiB 保留线保持。正式 sealed 候选/恢复、云模块、R119/R120/R121 来源、生产日志、CMS 数据与备份均保留。当前冻结工作区的发布工具依赖仍需保留。原 Documents checkout 的用户修改保持；被清理依赖的旧 checkout 再运行本地命令前需依锁文件安装。本次未新建 worktree。
