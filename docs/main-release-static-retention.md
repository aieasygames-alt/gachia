# 主站发布：旧静态资源保留与生产验收

## 目的与边界

主站部署会替换静态资源集合。仍打开旧页面的用户可能继续请求旧 chunk，因此“新首页返回 200”不足以证明发布安全。本规则仅保留当前生产构建的 `.open-next/assets/_next/static/`，不引入旧 Worker、HTML、数据库、服务端缓存或配置，不改变四个游戏 Worker 与 Router。

这是主站发布门禁，不是合并 Worker、恢复账号或自动清理历史文件的授权。当前版本的账号接口应为 404 + `ACCOUNT_FEATURES_DISABLED`，而非旧版的 session 200。

S2.4 增加前置内容门禁：正式准备发布前先执行 `pnpm content:release-ready`。S2.5 已关闭声骸一对，当前仍有两对 raw 数据待审，命令预期失败，主站 production 请求在依赖安装/构建前即停止，真正推广前再次核验。本地 deploy/upload 同样阻断，普通 build/preview 和隔离 staging 保留审查用途。不得只同步待审文件或清空台账获得通过；需按[内容契约](content-source-and-sitemap-contract.md)完成字段/区服/语言审核。这个门禁不代替本页的静态资源、生产版本和回滚保护；本页后续步骤仅在内容门禁通过后适用。

## 生产输入与可信链

正式发布仍通过 `.github/workflows/deploy.yml` 的手动 production 入口，要求 main ref、`RELEASE_MAIN_ONLY`、production environment job 和当前 100% 活跃版本。environment job 只有在仓库配置了保护规则后才提供人工审批，不得仅凭存在 environment 名称就声称已经审批。新增两个显式输入：

- `previous_web_artifact_id`：产生当前线上版本的精确 GitHub artifact ID；同 commit 的不同运行不能互换。
- `previous_web_artifact_sha256`：GitHub artifact ZIP 的 SHA-256，不是 ZIP 内 `web-worker.tar.gz` 的摘要。

`scripts/prepare-previous-web-assets.mjs` 只读取固定仓库的 Actions API，确认 artifact 未过期、摘要一致、来自本仓 main，并核对成功 deploy job 日志中的 artifact ID 和 `Current Version ID`。下载后再次核验 ZIP 摘要，不执行旧产物里的代码。build job 仅增加 `actions: read`；生产 deploy job 不获得这项额外权限。

GitHub runner 的 `gh` 版本可能比本地更新。读取部署日志/ZIP 时按 `gh api --help` 检测是否支持 `--allow-escape-sequences`，仅对固定白名单中的这两类机器载荷启用，输出始终捕获在管道中，不展示原始控制字符或二进制。日志去除终端控制序列后再核验对应关系；ZIP 字节保持不变再校验摘要。普通元数据不使用此开关，旧版 CLI 不传不支持的参数。

旧资源只能来自可证明对应当前线上版本的产物。过期、找不到对应日志、混合流量版本或线上版本漂移时停止，不从任意 commit 重建来冒充原始产物。

## 产物顺序

1. 正常构建、测试及应用运行时检查。
2. 下载精确旧产物；安全提取静态目录，先验证全部路径、链接、重复与文件/目录冲突，再写入新临时目录。
3. 合并旧静态资源；相同路径必须字节相同，否则视为不可变资源冲突，停止，不覆盖候选文件。
4. 生成非公开 `retained-web-assets.json`：记录来源、文件路径、大小、SHA-256 和 Worker 入口摘要；验证产物可移植性。
5. 封存一个不可变 tar，staging 与 production 下载同一 artifact ID 并验证同一 tar 摘要；中途不重建。
6. 两次部署前均核验保留清单。production 请求的 staging 作业对最多 12 个旧资源 GET 校验字节，优先覆盖 webpack/CSS，并为下载的编译产物执行 31 项 HTTP、18 场景浏览器验收及 8 项跨 owner 浏览器夹具检查；不能用 build 作业的 dev-server 测试替代。失败阻断 production，并保留失败记录；这不意味着执行了所有历史 chunk。
7. production 写入前再次读取当前部署，确认回滚 UUID 仍为唯一 100% 活跃版本；保留证据后才能发布。

本地预备入口（执行前先完成生产版本/产物对应关系核验）：

```bash
PREVIOUS_WEB_ARTIFACT_ID=<artifact-id> \
PREVIOUS_WEB_ARTIFACT_SHA256=<github-zip-sha256> \
ROLLBACK_VERSION=<currently-active-main-uuid> \
node scripts/prepare-previous-web-assets.mjs
node scripts/retain-web-assets.mjs verify <currently-active-main-uuid>
node scripts/retain-web-assets.mjs staging <currently-active-main-uuid>
pnpm test:release
```

`staging` 命令固定访问既有主站 staging，不接受自定义 origin。预备命令会下载历史 ZIP 到被忽略的 `.release-records/`；失败记录和既有封存产物不自动删除。

## 有界保留与运营成本

- 单个历史 ZIP / 内层压缩 tar 各不超过 128 MiB；展开内容不超过 512 MiB / 50,000 条目；选中静态文件不超过 64 MiB / 5,000 个。超预算失败，不静默截断。
- 正式 production 构建 artifact 在 GitHub 保留 30 天；一般验证/staging 仍为 7 天。此变更会增加已有 Actions artifact 存储用量，但不会在本地提交时创建付费资源。
- 30 天不是永久备份。发版间隔可能超过此窗口时，应提前保全当前线上封存产物及可信部署证据，并单独评审恢复入口；当前脚本不接受本地 ZIP 绕过 GitHub 对应关系核验。
- 上一代资源可能已经包含更早一代文件，因此递归保留不会自动形成严格两代窗口。达到预算前须按版本清单、访问/缓存窗口与回滚依赖提出 GC 预演；本功能不做自动删除。
- 原有发布产物、回滚记录和业务数据继续受保护。将来清理须先提供引用保护、备份及人工批准，不以“减少磁盘占用”为由删除唯一证据。

## 验收与回退

主站通用链接从 `lib/i18n/navigation` 导出受 owner 约束的 Link：根据游戏部署注册表，指向独立 live Worker 的链接输出原生 `<a>`，不发起 Next RSC 预取；仍由主站负责的路由保留 next-intl/Next 客户端导航。语言、查询参数、片段、样式、ref、用户事件及浏览器新标签行为保留，不通过取消默认点击或强行 `location.assign` 模拟。此主站包装器不支持旧式 `as` 路由别名；需要添加时必须同时验证别名的实际 owner，不能绕过导航边界。已存在的搜索结果原生链接保持不变。

回归包括四款独立游戏的桌面/移动浏览器点击与返回，断言没有预取、只有文档请求且新文档不继承主站状态；三语言 HI3 仍验证同 owner 客户端导航。不要只断言“最终到达了目标页”，Next 的 chunk 失败后整页降级也可能满足这个弱断言。

`pnpm audit:production` 保持固定正式域名、GET、手动重定向和无凭据；根据源码账号策略核验 session 响应，同时检查五个页面 owner、各自 JS/CSS 命名空间和四个游戏 sitemap。任一失败使审计失败，不通过改变 DNS、WAF、TLS 或登录策略制造通过。

发布前还应完成三语言主站 Worker/浏览器检查、桌面/移动跨 owner 硬导航与返回、旧页面资源字节抽样和非主站版本对账。真正生产发布后须重跑审计并观察错误率；staging 成功不等于生产已验收。

失败时按已记录的旧 UUID 回退主站，不迁移数据库、不回滚游戏 Worker。平台回退引用可读不等于已演练回退；上线计划需明确观察窗口和操作人。旧版账号可能随主站回退恢复入口，须纳入回退评审；不得为了避免这一点贸然删历史数据或 secret。
