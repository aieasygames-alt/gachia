# 异环材料来源复核队列（R125）

本文件是 `dependency-review-plan.json` 的人工复核入口，不是批准清单。所有条目当前为 `needs-source-review`，不得直接修改 `raw-materials.json`、删除关系或选择候选 ID。

复核每条材料时必须同时提供：权威身份与游戏版本、所有角色/阶段/数量的原始证据、公开 URL 及消费者影响。证据改变后重新运行 dependency plan，旧 `planKey` 不得复用。

## 缺失材料

- `advanced-hunter-guide`
- `anima-crystal`
- `anima-fragment`
- `basic-hunter-guide`
- `boss-anima`
- `boss-chaos`
- `boss-cosmos`
- `boss-incantation`
- `boss-lakshana`
- `boss-psyche`
- `chaos-core`
- `chaos-essence`
- `cosmos-spark`
- `cosmos-storm`
- `credits`
- `expert-permit`
- `incantation-crystal`
- `incantation-shard`
- `lakshana-dust`
- `lakshana-signet`
- `manual-attack`
- `manual-defense`
- `manual-support`
- `master-permit`
- `pioneer-permit`
- `psyche-essence`
- `psyche-fragment`

这 27 个 ID 当前都没有可靠词法候选。每个 ID 的引用指针、角色和数量已经绑定在 `dependency-review-plan.json` 的异环 plan 中。

## 当前来源复核结果（2026-11-16）

已对照官方异环入口、官方角色导航、官方 1.5 更新公告和可访问的 Game8 异环材料目录保存证据，见
[`source-evidence/nte-source-evidence.json`](source-evidence/nte-source-evidence.json)。官方入口只确认游戏/发行方身份；Game8 目录和三个猎手指南页能提供第三方术语候选，但不能单独满足生产审批所需的权威身份、版本、阶段、数量和消费者证据。

官方角色导航页新增确认：`role-tab-zero-male` 与 `role-tab-zero-female` 各出现一次，两个展示入口共用 `role-name-zero.png` 和 `role-dec-zero`。因此 `zero` 的规范身份已经有官方证据，男/女是展示变体；这只解决角色身份语义，不等于已批准把现有 raw 关系迁移到任一变体，也不改变材料依赖的 held 状态。官方 1.5 更新公告还确认 `Elite Hunter Guide`、`Manhole Boss`、`Expansion Core`、`Chaotic Dye` 等已有材料术语和版本边界，但它不提供 27 个缺失 ID 的完整清单。原始页面、公告和响应头保存在 `source-evidence/official-main.html`、`source-evidence/official-patch-1.5.html` 及对应 `*-headers.txt` 文件。

本轮继续抓取官方角色页引用的 23 个外部脚本资源，均有 HTTP 200 证据，并留存 body、响应头和 SHA256，见 [`official-resource-fetch.json`](official-resource-fetch.json) 及 [`fetch-official-resources.mjs`](fetch-official-resources.mjs)；其中 16 个在本轮重抓成功，7 个因临时 DNS 失败复用此前已保存的成功 body。对主页、1.5 公告、新闻/轮播数据、公共脚本和主脚本做结构化字段扫描，`levelingMaterials`、`skillMaterials`、`ascensionMaterials`、`levelRange`、`materialId` 均为 0 次命中；`nte_data_data` 只包含新闻轮播图/链接，`newsdataObj` 只包含公告索引。逐材料缺口和每条依赖的角色/引用数量见 [`official-material-source-audit.md`](official-material-source-audit.md) 与 [`official-material-source-audit.json`](official-material-source-audit.json)。27 个 held ID 的官方 ID/名称短语命中均为 0，身份/版本、全部阶段与数量、URL/消费者三类证据仍全部缺失。该结果排除了官方静态资源路径，但不等于客户端数据不存在；下一步转向客户端或游戏内可导出的材料表。

本轮又固定了官方全球安装器入口（约 54 MiB，PE32/Nullsoft NSIS，SHA-256 为 `345e84bab04f24b0ec4907e297569586ef155087ecc1732f88757e7eb94a4994`）。安装器样本未提取出游戏资源、JSON/CSV 材料表或可复核客户端清单，明文仅见安装器/证书字符串；完整元数据与扫描脚本见 [`official-installer-audit.md`](official-installer-audit.md)、[`official-installer-audit.json`](official-installer-audit.json) 和 [`audit-official-installer.mjs`](audit-official-installer.mjs)。它只能作为后续隔离客户端安装的来源入口，不能作为 27 个材料的 source-bound 输入。

本轮继续解码官方 CDN 压缩资源。`3000001.dat` 与 `Default.dat` 均按 Qt RCC v3 的大端 header、树、名称表和 payload 成功读取，分别得到 547 与 695 个文件；61 与 29 个文本资源中，`material`、`anima`、`psyche`、`chaos`、`cosmos`、`incantation`、`lakshana`、`hunter`、`character`、`ascension`、`skill`、`level` 关键词均为 0 命中。资源内容是启动器 UI JSON/XML、配置、图片和字体，不能绑定材料身份或阶段数量。可复验脚本与摘要见 [`decode-qt-resources.mjs`](decode-qt-resources.mjs)、[`nte-client-rcc-audit.md`](nte-client-rcc-audit.md) 和 [`nte-client-rcc-audit.json`](nte-client-rcc-audit.json)。

同时保存了官方 `PatcherSDK_x64.dll` 压缩样本并完成协议字符串审计。SDK 明确读取 `ResList.zip`、`ResList.bin.zip`、`Diff/Diff.xml`、`gameinfo.xml`、`client.xml`、`config.xml`、`branch_config.xml`，并包含 Pak manifest、`.pakpatch`、版本和设备列表处理路径；它没有材料表或材料 ID/数量映射。`PatcherCheckConfig.json` 只约束 `.sig` 与 `.utoc` 校验大小。证据见 [`nte-client-patchersdk-audit.md`](nte-client-patchersdk-audit.md)、[`nte-client-patchersdk-audit.json`](nte-client-patchersdk-audit.json)、[`audit-patchersdk.mjs`](audit-patchersdk.mjs) 和 `source-evidence/nte-client-resource-PatcherSDK_x64_dll-primary.*`。公开可读的 `ResList`/`config.xml` 版本清单仍未取得，不能从哈希或协议字符串猜测材料。

随后对两条 CDN 的 42 个有界资源清单候选端点做了 `HEAD` 探测：8 个已知的 `gameinfo`、`Diff`、`update` 和设备列表端点返回 200，34 个 `ResList`/`client.xml`/`config.xml`/版本路径返回 403。没有下载任何 Pak、UCAS、UTOC 或 ResList 大文件；详细状态见 [`nte-client-resource-manifest-probe.md`](nte-client-resource-manifest-probe.md)、[`nte-client-resource-manifest-probe.json`](nte-client-resource-manifest-probe.json) 和 [`probe-nte-resource-manifests.mjs`](probe-nte-resource-manifests.mjs)。

本轮随后读取官方 `Version.ini` 和 `AllFiles.xml`，固定客户端版本 `1.0.8.1102` / build `b7e5b78c`、产品版本 `1.0.8.1102_4` 和 684 个文件的清单。清单明确列出 `FileList.dat`、`ResData/3000001.dat` 及四个 `PatcherConfig/*.json`，并提供文件大小和校验值；更新器样本也确认解析 `All_Files`、`ProductVersion`、`BaseUrl`、`File`、`Checksum`、`Path`、`Size` 并通过 WinHTTP 下载。裸路径的 32 个 `HEAD` 探测和两个 `FileList.dat` `GET` 复核为 403/`AccessDenied`，但按更新器的 `.zip` 规则读取的主/备用 14 个资源地址全部 200，主 CDN 七个压缩对象的 MD5 与 `AllFiles.xml` 的 `ZipChecksum` 一致；`PC_150/gameinfo.xml`、`Diff/Diff.xml` 和 `Publish_Update/update.json` 也均 200。`PatcherConfig` 确认 `clientRes`、`PC_150`、`Publish_Update` 和 `appId=3000001`，`ResData/3000001.dat` 为 Qt resource container。证据见 [`nte-client-manifest-audit.md`](nte-client-manifest-audit.md)、[`nte-client-manifest-audit.json`](nte-client-manifest-audit.json)、[`audit-nte-client-manifest.mjs`](audit-nte-client-manifest.mjs) 和 `source-evidence/nte-client-*`。资源字节已经取得，但尚未解出材料身份、版本、阶段、数量或消费者表；材料门禁继续保持 held。

因此目前没有生成 source-bound plan，也没有批准以下候选：

- `basic-hunter-guide` → `rising-hunter-guide`
- `advanced-hunter-guide` → `senior-hunter-guide`

`elite-hunter-guide` 本身已经存在于仓库材料清单；Game8 页面只作为现行术语的第三方交叉观察，不是新的映射。

本轮新增 Game8 材料目录的逐条对账：仓库现有 57 个材料中有 43 个能在目录中找到同名独立页面，14 个现有材料也没有同名页面；27 个 held ID 没有任何同名页面，其中 14 个只有 `guide`、`boss`、`core`、`fragment` 或 `spark` 等宽泛词法候选，13 个完全没有词法候选。审计结果和可复验脚本见 [`game8-material-index-audit.json`](game8-material-index-audit.json) 与 [`audit-game8-material-index.mjs`](audit-game8-material-index.mjs)。这些候选不能证明材料身份、版本、阶段、数量或 CMS 消费者，因此不改变 held 状态。

本轮继续做角色材料消费者对账：从 Game8 目录保存 17 个角色 URL，其中 16 个是有效的角色材料页，`taygedo` URL 实际是 Boss 指南；`nelly`、`merula`、`alphard`、`lilina` 在捕获目录中没有角色归档。16 个有效页面都公开了 `Lv.20→Lv.30` 至 `Lv.70→Lv.80` 六段升级表，材料展示名包括 `Fading Silhouette`、`A Page from Delusion's Shore`、`Blurred Silhouette`、`Chaos Silhouette` 和 `Beetle Coin`，与 raw 的 `1-10` 至 `51-60` 阶段和占位 ID 不能安全一一对应；页面也没有 raw `skillMaterials` 字段。公开的 20 个材料名称恰好都能在现有 `raw-materials.json` 找到同名 canonical ID，但每个候选仍为 `approvedTarget=null`，不能据此重写关系。下载清单、响应头、SHA256 和差异报告见 [`game8-character-fetch.json`](game8-character-fetch.json)、[`game8-character-material-audit.json`](game8-character-material-audit.json)，可复验脚本见 [`fetch-game8-character-materials.mjs`](fetch-game8-character-materials.mjs) 和 [`audit-game8-character-materials.mjs`](audit-game8-character-materials.mjs)。这证明现有消费者存在来源差异，但仍不能批准 ID、阶段或数量迁移。

材料 typed dependency snapshot 已生成并保留原始顺序、阶段和数量，见
[`material-dependency-snapshot.json`](material-dependency-snapshot.json)。异环 snapshot 的 `snapshotKey` 为 `10c0c6325194e48befebb8178606b6ad9ad151745930202a14cea507a2ab27f5`；仍为 `hold=true`、`publishable=false`、`releaseCompatible=false`。

搜索分片的当前源码运行时核验已经完成，见 [`nte-search-runtime.json`](nte-search-runtime.json) 和 [`probe-nte-search-runtime.mts`](probe-nte-search-runtime.mts)：`games.json`、`search-zh.json`、`search-en.json`、`search-ja.json` 均返回 200，NTE/Genshin 内容版本头正确，其他游戏聚合保持不变；`HEAD` 返回 200、写方法返回 405，NTE owner 不可用时返回 503 且不回退。该证据使用隔离的 NTE/Genshin 内容 fetcher 和 Main 聚合 fixture 直接调用 Router 运行时，没有 CMS、云端或生产写入；它不能替代独立 Worker 构建、云预览和正式发布后的快照读回。

## 角色身份

`zero` 在仓库中仍缺少 canonical `zero` 记录，只有 `zero-female`、`zero-male` 两个展示变体，因此依赖计划仍把它列为缺失角色。官方角色导航已确认 canonical identity 与变体关系；Game8 的性别切换说明只是辅助语义证据。下一步需要在新的 source-bound plan 中显式定义 canonical `zero` 与两个展示变体的关系，并核对所有消费者后再重写关系；当前不能自动选择一个变体或编辑 raw 数据。

## 通过条件

只有在 27 个材料的身份、版本、阶段、数量、URL 和页面消费者影响，以及 `zero` canonical/variant 关系都被人工批准后，才可以生成新的 source-bound plan，并继续材料 typed snapshot、metadata、媒体/权利和独立 Worker 快照读回。当前不允许自动改名、补造材料、选择 `zero-male`/`zero-female` 或回退到 Main 副本。
