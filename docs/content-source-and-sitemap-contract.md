# 内容源与 Sitemap 契约

适用版本：S2.1。本契约目前覆盖主站 sitemap 所有权及遗忘之海攻略的派生物一致性，不表示全站内容事实已核验。

## 1. 公开发现入口

| URL | 文档类型 | 所有者 |
|---|---|---|
| `/sitemap.xml` | `sitemapindex` | 主站；只列子图，不列页面 |
| `/sitemaps/main/sitemap.xml` | `urlset` | 主站页面和仍由主站承载的游戏 |
| `/sitemaps/{game}/index.xml` | 现有游戏子图 | 注册表声明的独立游戏 Worker |

当前独立 owner 为 genshin、nte、azur-promilia、lvmeng。根索引从 `packages/core/deployments.ts` 的 live/game 声明生成，不再维护第二份线上游戏列表。draft、preview、maintenance、retired 不进入根索引；缺少或重复的 live 子图地址会报错，不静默漏掉。

主站子图排除所有 `deployment: game` 的游戏，不论其状态。一个独立 owner 是否允许某个语言、某篇攻略被索引，由其自身 sitemap/robots/metadata 契约决定；主站不得再次提交该游戏页面来绕过保护。把子图从根索引暂时移除不等于删除页面，也不能替代该游戏自己的 noindex 或退役策略。

根入口仍为 `/sitemap.xml`，现有四个独立子图 URL 不改。Router 无须新增绑定或改写规则；根入口及 `/sitemaps/main/sitemap.xml` 都走 MAIN_SITE。人类阅读的 `/{locale}/sitemap` 页面不受本次 XML 路由迁移影响。

## 2. 遗忘之海攻略试点

权威工程输入：`packages/data/games/sea/raw-guides.json`。这表示派生链的输入位置，不等于其中每项历史事实已重新查证。

| 消费者 | 输入/输出 | 检查方式 |
|---|---|---|
| 攻略模块、首页攻略、详情辅助数据及 sitemap | 原始源；无文件系统时走 `/data/sea/raw-guides.json` | 原始镜像与源逐字段语义相等 |
| 攻略列表及详情推荐摘要 | `/data-client/sea/guides.json` | 从源移除正文三语言及 faq 后严格相等 |
| 攻略详情优化路径 | `/data-client/sea/guides/{id}.json` | 每篇与源中对应条目严格相等 |

S2.1 基线为 75 篇、77 个公开产物。没有把所有 Sea 数据、其他游戏、搜索索引或后台编辑器宣称为已纳入同一契约。现有搜索生成器未消费 Sea 攻略正文；静态新闻/推荐文案也不是本生成器的产物。

实现：`packages/data/scripts/sea-guide-contract.mjs` 同时提供纯派生函数、显式生成器和只读检查器。普通 JSON 对象键顺序与缩进不影响检查；数组顺序、正文、标题、日期及字段差异均影响检查。语义摘要使用 Node 的排序键 JSON 编码，不可与格式化文件的字节 SHA 混用。

### 编辑流程

在仓库根目录使用 Node 22：

```sh
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
# 编辑、核验权威源后，显式更新派生物；不改变源的业务日期。
pnpm --filter @gachia/data generate:sea-guides
pnpm --filter @gachia/data check:sea-guides
pnpm --filter @gachia/data test
pnpm --filter @gachia/web test
pnpm --filter @gachia/web build
```

源与公开产物必须同批审查、同批提交。`generate:manifests` 复用同一生成函数，不另外实现 Sea 攻略裁剪逻辑。生成器不会查询官网、决定哪个事实版本正确、补翻译或伪造 updatedAt。

只读检查存在于主站 build/preview/deploy/upload 的运行时前置入口、manifest 验证器及数据包测试中。Actions 在 `generate:manifests` **之前**检查已提交的产物，防止 CI 自动重生成掩盖漏提交。不要以 OpenNext 的 skip-build 或未受控手工 Wrangler 发布绕过主站前置检查。

缺失、非法 JSON、语义漂移都会失败。源中重复/不安全 ID、空正文在生成前失败。孤立详情文件也会失败；生成器保留它们，要求先审核退役、引用和历史保留规则，不能自动清空目录。S2.1 未删除任何游戏正文或历史资产。

## 3. 本地编译后验收

`node scripts/runtime-rollout-smoke.mjs web` 使用现有隔离本地 Worker，验证根索引发现主站子图，再从主站子图检查实际阅读 URL。继续执行原有无账号、资源、404、交互/延迟脚本/无 JavaScript 桌面移动端回归，不把索引改造当成跳过原门禁的理由。

已启动本地 Worker 时，可使用标准 XML 解析器验收：

```sh
pnpm audit:sitemap-contract:local --origin http://127.0.0.1:PORT
# 若有旧 URL 清单，必须声明证据性质，不能把重建结果称作线上抓取。
pnpm audit:sitemap-contract:local --origin http://127.0.0.1:PORT \
  --before-json /absolute/path/to/old-entries.json \
  --baseline-kind runtime-assets-reconstruction \
  --output /absolute/path/to/report.json
pnpm test:release
```

旧清单格式为 `[{"url":"https://gachia.com/zh"}, ...]`。检查器只访问显式 loopback origin 的根图和主站子图，不自动访问四个生产游戏、不跟随重定向、不使用系统代理。检查 XML namespace、根结构、canonical origin、重复 URL、主站/游戏 owner 边界及旧 URL 移除原因；未知移除立即失败，没有“全部忽略”的开关。XML HTTP 类型也必须正确。

本地 fixture 无真实云端缓存绑定，必须区分源码求值、Next 预渲染、ASSETS 回退和实际生产 HTTP。S2.1 已发现 roco-cn 源/镜像缺条导致三语言 URL 的差异，不能用忽略列表消除这个信号。见阶段报告的源/运行时边界记录。

## 4. 后续推广与回退

- S2.1 不自动把六对非试点漂移同步为源版本；skjh 的公开镜像含源中没有的运营修订，单向覆盖会丢内容。
- 扩展下一游戏前，先确认官方事实/区服/日期和退役 URL，再把源、镜像、页面语言与 sitemap 作为同批变更验收。
- 真正发布前仍需受控 staging、根索引及全部子图 HTTP、正文与语言契约、静态资产保留、生产回滚版本和 Actions 预算核验。单元测试或本地 XML 通过不表示已上线。
- 回退必须回退完整代码及派生物组合，不能仅回退原始源或一份公开镜像。S1 静态资源保留与无账号策略继续适用；不得恢复登录、覆盖其他 Worker 或删除保留证据。
