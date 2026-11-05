# R40 精确源码交付、真实Worker与磁盘建议

日期：2026-11-05。接续[五项实现](../project-next-phase-2026-11-05/README.md)，工程工作区仍为 `/Users/robert/.codex/worktrees/payload-unified-maintenance/gachia`。旧 `/Users/robert/Documents/gachia` 不同步、不覆盖、不用于本轮发布。本轮仅提交维护分支、只读CI、隔离CMS与本地构建验收；不自动删除、不改正式CMS内容、不安装、不上传/部署Worker或R2。

## 精确交付

- 62份指定源码、测试、当前清单、计划和简要报告已提交并推送维护分支，源码提交 `00eaf2caebdaecbfbf8df7052eb96ed18cd9c4ee`。未批量加入原始证据、运行日志、数据库、私有配置或旧工作区修改。
- [本次GitHub只读CI](https://github.com/aieasygames-alt/gachia/actions/runs/41976201593)针对该精确源码，Node22.23.4/pnpm10.10.0，**success，7分55秒**：CMS181、desktop828/其他Node304/Python56、Web440/Data168/Router35及消费者12项、公众/共享类型均通过；inventory16 scopes、手册/分类38项通过。这是实际Linux CI，不用本机Node25结果替代。
- 本机新鲜inventory覆盖16 scopes，手册/分类门禁38/38、暂存diff-check通过；此前全量本机回归见五项实现报告。
- 构建前实际空间约32.29GiB，14GiB预算通过。前轮10–11GiB不足是历史观察，不再作为当前阻塞；没有删除任何东西，不将空闲增长归因于清理。
- 新鲜远端观察：维护分支为上述源码提交，main仍`71a52728be2c9612d0b39be47092b7d85a320ac3`，`CLOUDFLARE_DEPLOY_FROM_GITHUB`与`CLOUDFLARE_DEPLOY_STAGING_FROM_GITHUB`仍为`false`；没有合并main或开启云部署。

## 隔离候选

通过已安装manager只读导出正式NTE版本，确认现有53篇公开文本；在独立SQLite Payload中以editor草稿、reviewer批准重建当前1条已批准文字及[待入库中文文章](../../plans/nte-next-guide-draft-2026-11-05.md)。实际exporter导出54篇preview，逐记录确认53篇既有公开内容保持，正式NTE新增导出仍拒绝。隔离DB保留，本机正式PostgreSQL没有新增文章/批准写入。

候选ID `cms-returning-resource-checklist`，preview releaseKey `514b2116e6887c3500c54e51040ab69a7ba4f612969f3b1a98a4b73782be5e79`。仅可用于本地消费者工程验收，**不是正式文章或可推广候选**。冻结前按现有source-catalog重新校验当前NTE/Main来源与精确云模块，Genshin当前公开32篇冻结入Main，不回退Git的31篇导入O。Wrangler官方whoami续签已有OAuth供只读来源核验，没有Worker写入或认证重试。

本地双owner构建、HTTP与浏览器均已通过：

| 检查 | 实际结果 |
| --- | --- |
| 冻结run | `514b2116e6887c35-d272a1a01f0c`，plan SHA `b3086ec3fdf683f1298cbb78dddff0810431b5e656e65ce50e70cb7eee8e8421` |
| 双owner | NTE/Main production bundle完成，制品清单1535/3164文件，各19 links；逐文件完整性/portable通过 |
| 候选真实Worker HTTP | 30响应（NTE27/Main3）；新篇三语言列表/详情、fallback/noindex、canonical、JSON-LD、sitemap、CSS/JS精确字节、Main候选JSON与账号关闭通过 |
| Chromium真实Worker | 桌面1440×1000、手机390×844各中英日列表/详情，共12视图；真实CSS/JS/logo正常，无page error/失败响应/外部请求、横向溢出或标题正文重叠 |
| 缺译文语义 | 中文正常索引；英日显示中文原文与来源链接、lang=zh-Hans、noindex/follow；英日不进入hreflang/sitemap，Article语言与正文一致 |
| 当前旧来源Worker | 10响应；新增前三语言URL实际404/noindex、无文章canonical/Article JSON-LD、旧列表/sitemap无新篇，两游戏JSON仍53/32，账号关闭 |
| 常驻CMS | 685应用文件/29工具摘要与R39安装一致，健康且未重启；85内容/1用户/1媒体、3条eligible；前后完整canonical DB摘要相同 |

截图已实际查看：[手机英文详情](worker-detail-en-390.png)、[桌面中文列表](worker-list-zh-1440.png)。[浏览器结果](browser-result.json)、[旧来源HTTP](previous-result.json)、[候选HTTP](preview.json)、[安装/数据终态](local-final.json)保存在本机，不把组件隔离渲染冒充真实Worker。

旧来源检查只证明新增前URL与当前内容语义，**不是新旧静态并集的兼容恢复制品，也不是精确Cloudflare候选/恢复四版本或公网发布验收**。NTE正式新增门禁没有自动解除。本轮未重建/安装CMS应用，未刷新异地包，未尝试重新推广历史releaseKey。

## 空间盘点

[原始只读盘点](storage-initial.json)记录目录分配字节、缓存候选、隔离数据和相关进程cwd，不保存进程完整参数、凭证settings或数据库内容。独立du统计可能重复计算共享hardlink/APFS clone，不能把各项直接相加当唯一物理占用；预计可回收量也不是保证。

| 根目录 | 分配空间 | 决定 |
| --- | --- | --- |
| `~/.gachia-cms-releases` | 45.54GiB | 保留：当前/父来源、恢复、pin、失败journal均可能依赖；未完成完整可达性证明 |
| `~/Library/pnpm/store/v10` | 6.40GiB | 保留：新run离线安装需要，不执行store prune |
| `~/Documents/gachia` | 6.24GiB | 保留旧修改；仅以下cache子目录列入建议 |
| `~/Library/Application Support/GachiaCMS` | 5.75GiB | 保留在线应用、旧回退、DB、key、备份与publisher |
| 维护工作区 | 4.93GiB | 保留当前工程；仅以下CMS cache子目录列入建议 |
| `~/Library/Caches/ms-playwright` | 2.09GiB | 多版本浏览器；有其他工具使用，未验证版本归属前不删 |

### 优先建议：只删可再生成cache，合计约1.54GiB

**以下是审阅候选，不是已经执行或无条件可删。** 停止相关本地dev/build进程后，确认没有外部封存依赖这些精确目录，再逐项清理；只涉及cache子目录，不能扩大到`.next`、`.open-next`、源码或node_modules。CMS安装器明确不复制`.next/cache`，当前常驻CMS位于独立GachiaCMS/releases，维护工作区cache不是在线应用本体。清理的代价是后续重新编译。

| 完整路径 | 分配空间 |
| --- | --- |
| `/Users/robert/.codex/worktrees/payload-unified-maintenance/gachia/services/content-cms/.next/cache` | 467.1MiB |
| `/Users/robert/Documents/gachia/apps/game-nte/.next/cache` | 303.2MiB |
| `/Users/robert/Documents/gachia/.turbo/cache` | 256.2MiB |
| `/Users/robert/Documents/gachia/apps/game-genshin/.next/cache` | 206.7MiB |
| `/Users/robert/Documents/gachia/apps/game-azur-promilia/.next/cache` | 182.2MiB |
| `/Users/robert/Documents/gachia/apps/game-lvmeng/.next/cache` | 161.4MiB |
| `/Users/robert/Documents/gachia/apps/web/.next/cache` | 1.2MiB |

### 需要进一步核对，不建议直接删

- 旧工作区 `.gachia-workbench` 约2.78GiB，几乎全部为HI3历史build-attempts；这不是Payload缓存，含历史候选/诊断来源，需独立工作台所有权和依赖审阅。
- 维护工作区 `services/content-cms/.local` 约1GiB。大项包括batch10-verification、batch8/9-verification、migration、batch4–7-before等，属于隔离数据库/媒体，不是正式PG，但可能是迁移前后证据或唯一数据副本。先核对备份和报告引用，不能整目录删除。
- 603个空的隔离测试目录可以后续整理，但几乎不回收字节，不应优先为此做删除操作。本轮新隔离DB也保留。
- `node_modules`、`.open-next`、release/source-catalog、sealed报告、旧CMS应用、冷备和key不因“旧”“重复”或未搜到字符串引用而视为垃圾；本轮没有完整pin感知GC。

**本轮删除0文件，回收0字节。** 用户要求的是提醒，未授权清理，不提供或执行宽泛rm/clean/prune命令。

[构建后盘点](storage-final.json)可用约**30.39GiB**；新preview run分配约1.77GiB，仍保留源码、制品、状态和验收日志。前后空闲差并不是精确构建峰值或可回收量。约1.54GiB缓存候选未变，所有正式来源与恢复树均未删除。

## 仍待完成

N01公网JSON-LD修复、N04精确云候选/兼容恢复/正式发布、N05正式CMS新增/安装/完整发布与来源交接/备份仍待后续。NTE新增preview门禁保持，不因本地通过自动解除。N06仍是review_required只读合同，不激活reset/撤回，不将hold等同网站删除。

当前生产身份仍以R39为历史已接受基线，本轮没有公网切流；限定V1、原始P/T、账号关闭、IndexNow暂停、CMS仅此Mac及独立key暂缓决定不变。

下一步有界安装与正式NTE切片必须使用精确新源码和独立新run；解除preview-only属于后续明确代码变更，不能将本轮隔离候选改preview标记后推广。新文章仍须先写正式CMS、重读/批准，再四版本/900秒/公网/来源交接/备份。本轮源码与文档身份、CI、原始证据摘要由本机`delivery.json`/`evidence-index.json`另存，不提交私有运行证据。
