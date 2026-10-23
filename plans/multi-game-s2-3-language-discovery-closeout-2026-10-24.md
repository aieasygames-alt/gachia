# S2.3：攻略语言与平台发现路径交付

日期：2026-10-24，Asia/Shanghai。基线 `11a3e1e`；隔离分支 `codex/multi-game-s1-release-safety`。

结论：**本批本地开发与限定验收完成，未推送、未部署；S2 整体尚未完成。** 未触发 Actions，未修改 Router/Worker 拓扑、数据库或登录策略，未执行磁盘清理或删除业务/历史资料，未修改原始脏主工作区。

## 1. 本批问题与处理

| 问题 | 实现 | 保留边界 |
|---|---|---|
| 原神缺日文正文却提交日文攻略详情 | 一个 guide-policy 决定正文完整性、阅读语言、metadata/hreflang、FAQ 与独立 sitemap | 不删阅读 URL，不伪造翻译，不自动改变其他游戏或原神角色/武器等资料页 |
| 日文标题/摘要与英文正文混合 | 不完整译文整段回退英文，显示日文原文提示、原文链接及实际正文 lang；Article/WebPage 声明实际 inLanguage | 原始攻略、日期、FAQ 均未修改；不声称历史内容事实已重新审核 |
| 日文 FAQ 始终使用英文 | 正文有日文时只输出完整的日文问答；页面与 FAQPage 同源 | 缺失日文 FAQ 不冒充翻译；英文回退页继续显示标识为英文的问答 |
| 四类基础页缺 canonical，分享信息继承中文根级文案 | 首页、关于、联系、隐私、条款复用 platformMetadata，覆盖 canonical、hreflang、OG/Twitter | 公共地址、正文和政策业务日期不变 |
| 中文首页链接可能生成 /zh/zh/... | 三游戏 href 统一为不带 locale 的站内路径，由国际化 Link 添加一次；选择器同步接入已有 WorkerSafeLink | 独立游戏仍使用 S1 原生跨 Worker 导航，不改整个 Link 的既有行为 |
| post-test 被首页显示为待开服 | 首页、更新雷达、选择器共用完备状态标签表，显示“测试已结束” | 不刷新 checkedAt，不将测试优化计划描述成已实装 |

索引资格的工程门槛为标题/摘要非空、正文至少 80 字符，不等于事实审批或专业翻译质量验收。production 缺译详情为自身 canonical + `noindex, follow`，完整译文正常索引；非 production 保持 `noindex, nofollow`，不让局部规则覆盖预览保护。

## 2. URL 差分

原神当前 31 篇攻略，zh/en 各 31 篇具备正文，ja 仅 `lightrace-wish-phase-ii-faq` 一篇。旧独立 sitemap 的源码求值为 1,602 条，候选 Worker 实际 HTTP 和 Next 预渲染均为 **1,572 条，集合完全一致**：zh 534、en 534、ja 504。

仅移出 30 条 `/ja/genshin/guides/{id}`，无新增，移出原因逐条为缺日文正文；所有原文阅读路径保留，不做首页重定向。仅有日文标题/摘要的 `phase-ii-columbina-raiden-pull-plan` 也正确进入回退策略，不误当完整译文。

主站清单仍为 **4,464 条**，与 S2.2 实际 XML 及本批预渲染完全相等，无新增或移除。根索引的四个独立子图入口不变。公开原神子图路径仍为 `/sitemaps/genshin/index.xml`，独立本地 fixture 验收 `/sitemap.xml`；未改 Router 路由。

旧值是提交源码求值，不是当天旧生产抓取。未访问全部独立游戏的当前生产子图，不能将这些本地清单相加后声称全站生产已通过。逐项 URL 与摘要见[验证报告](../reports/content-integrity/s2-3-local-verification-2026-10-24.json)。

## 3. 回归与门禁

| 层次 | 结果 |
|---|---|
| web 单测 | 288 通过；包含语言资格、部分译文、预览保护、FAQ、平台分享元数据、一次 locale 路径 |
| data / Router | 65 / 31 通过；manifest 只读验证通过 |
| 发布安全 | Node 100、Python 静态保留 9、XML 8 通过 |
| 类型 / lint | 主站、原神类型通过；主站 lint 0 错误，保留 auth-dialog 既有 hooks 警告 1 项 |
| 应用构建 | 两应用 OpenNext 构建通过；原神显式 production 模式，41 份命名空间静态文件本地准备完成 |
| 主站 discovery | 32 浏览器例：三语言五类页面及中文更新雷达 × 1440/390px；metadata、重复前缀、post-test 及选择器动作通过 |
| 原神 discovery | 24 浏览器例：三语言列表和缺译/部分译文/完整译文三详情 × 双尺寸；实际正文、canonical、robots、hreflang、FAQ/schema、JS/CSS 通过 |
| 原有编译 Worker 回归 | 主站 32 HTTP + 18 浏览器，原神 14 HTTP + 18 浏览器；包含正常交互、延迟脚本、无 JS 模式及无账号/404 等既有保护 |
| S2.2 内容回归 | 3 份 raw JSON 与源相等；16 浏览器例保持通过，英文退役未恢复 |
| Wrangler dry-run | 主站 1,425 静态文件，13,931.82 KiB / gzip 2,830.72 KiB；原神 151 静态文件，8,713.76 KiB / gzip 1,338.72 KiB；仅本地打包，未上传 |
| workflow | YAML 解析通过；主站新增 discovery 位于安装浏览器之后、产物封存之前；本批没有运行 Actions |

新命令 `pnpm test:seo-discovery:local web|game-genshin` 不接受远程目标，复用既有隔离 Worker 和互斥锁，不使用真实数据库、OAuth 或云端服务绑定；浏览器阻断外部请求，XML 用标准解析器而非正则近似。主站 CI 复用已构建产物新增 32 例检查，不新增 Next 应用、独立构建或云端环境；未实测新增 Actions 分钟成本。

人工查看手机首页选择器、原神日文回退与完整日文页面截图，确认原文提示和正文可读；选择器点击后的 aria-checked、动作链接与最终样式经本地 DOM 检查一致。不是全站无障碍、所有攻略浏览器或完整 Markdown 渲染器验收；现有原神正文仍按原实现展示 Markdown 文本，渲染器改造不纳入本批。

## 4. 内容与证据保护

90 对原始 JSON 的源/镜像字节均与基线相同，仍为 87 对一致、3 对漂移：roco 角色、wuwa 声骸及区域。未重新核实官方数值、区服或实装，不机械归并，不改业务日期。登录继续停用。

精简持久报告：[S2.3 本地验证](../reports/content-integrity/s2-3-local-verification-2026-10-24.json)。原始证据：

- 日志及源码基线：`.release-records/s2-3/`。
- 主站 discovery：`.release-records/seo-discovery-web-aa3ddfe0-f6b1-4539-8413-5f3b9caa4221/`。
- 原神 discovery：`.release-records/seo-discovery-game-genshin-346b15aa-4121-4638-8180-05a453080cb3/`。
- 运行时：`.release-records/rollout-web-25e3532b-38dd-45ae-bb24-98d01e785302/`、`.release-records/rollout-game-genshin-2631a3d0-7cf5-4225-bac1-c5d1e018c1f7/`。
- S2.2 回归：`.release-records/managed-content-fda3256c-3508-4fba-b6d0-7d46845b636b/`。

不提交完整构建缓存和重复截图，也不在本批删除这些证据。环境仍为 Node 22.22.2 / pnpm 10.10.0 / Next 15.5.28 既有补丁 / OpenNext 1.20.13 / Wrangler 4.148.0。

## 5. 剩余工作与回退

S2.4 优先处理剩余三对内容差异的事实来源与区服/实装审核，以及 S2 当前候选的受控云端验收准备。真实发布仍需重新核实生产版本、保留旧资源、回滚组合、staging、跨 Worker 路径、根图与所有 owner 子图 HTTP/语言契约及完整并集差分；本地成功不直接证明可无条件上线。

历史 `genshin-seo-parity` 是旧 Main 与独立 Worker 的等价迁移检查，strict 基线并未在本批接管。缺译页有意的 title/description/robots 差异不能靠关闭 strict 或恢复假日文来“通过”；下一次真实原神候选发布前要先审查差异并建立匹配的新验收基线，不直接重用旧迁移工作流。

回退需回退完整代码组合，包括 guide-policy、页面、metadata 与 sitemap，不只回退一个过滤器。源内容未变，无内容迁移或数据恢复操作；继续保留 S1 无账号和静态资源保护。回退旧索引实现会重新引入缺译提交，不能把工程回退描述为 SEO 政策正确。
