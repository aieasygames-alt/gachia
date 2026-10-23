# Game Release Safety：S1 本地发布门禁

更新：2026-10-23（S1.3）。远程发布门禁仍仅覆盖异环与蓝色星原；运行时检查已覆盖全部五个 Next 应用。蓝色星原已完成一次独立云端 staging 验收，不是全站发布平台或生产放行声明。

## 1. 本阶段解决什么

- `deploy:preview` / `deploy:staging` 固定使用独立 staging Worker，不再调用默认生产目标。
- staging 的服务名、模式和公共 canonical 来源必须显式配置，不继承缺失值。
- 构建与部署使用相同的显式 Wrangler 配置和环境，阻止未知 CLI 参数透传。
- 预览默认禁止索引，校验实际生成的 robots、响应头及 HTML，而非只检查源码字符串。
- 部署前启动本地 Worker，检查真实服务端正文、canonical、真实详情、JS/CSS 与 404。
- 生产执行要求精确服务名确认和操作者提供的回滚 UUID；工具不会冒称已经验证云端 UUID。
- 写入本地状态记录，严格区分构建、检查、执行部署命令和线上验收。

未修改主站、Router、原神和绿梦的发布目标或生产流量。S1.3 已创建独立 `gachia-game-azur-promilia-staging`，部署前后六个生产服务版本未变；异环的同名 staging 配置仍未在本批执行。详见 [S1.3 交付记录](../plans/multi-game-s1-staging-closeout-2026-10-23.md)。

## 2. 目标映射

| 游戏 | production：Wrangler 默认环境 `""` | staging：命名环境 `staging` | 构建模式 |
|---|---|---|---|
| nte | gachia-game-nte | gachia-game-nte-staging | live / preview |
| azur-promilia | gachia-game-azur-promilia | gachia-game-azur-promilia-staging | production / preview |

环境只接受 `staging` 或 `production`，不接受隐式默认值、任意服务名或 `--config`/`--env` 覆盖。增加路由、服务绑定、数据库、存储桶或自定义构建入口时，当前策略会拒绝，需单独评估扩展。

本门禁针对受控脚本的误操作，不是抵御有本地源码和 Cloudflare 凭据权限的恶意操作者的安全沙箱。直接执行原始 Wrangler/OpenNext CLI 可以绕过包脚本，因此不得作为日常发布入口。

## 3. 只读查看计划

在仓库根运行，不构建、不启动服务、不写记录、不访问 Cloudflare：

```bash
pnpm release:game plan --game nte --environment staging
pnpm release:game plan --game azur-promilia --environment production
```

输出包括目标服务、索引模式、配置摘要、精确命令及部署副作用。`currentVersion` 和 `candidateVersion` 保持 `not_observed`；没有访问云 API 时不能填入猜测值。

## 4. 本地验证，不部署

```bash
pnpm test:release
pnpm --filter @gachia/game-nte verify:preview
pnpm --filter @gachia/game-azur-promilia verify:bundle
```

- `verify:preview`：预览模式构建、本地产物校验、本地 Worker HTTP 冒烟、Wrangler dry-run。
- `verify:bundle`：生产模式做同样的本地检查，不部署、不要求生产确认。
- 两者会创建可再生构建物、本地 Miniflare 状态和发布验证记录，不是只读命令。
- 推荐 Node 22；本阶段验证使用 Node 22.22.2 与冻结锁文件安装。

### 当前统一运行时与历史阻断

S1.1 完成两个试点，S1.2 将主站、原神、绿梦也精确锁定为 Next.js 15.5.28、OpenNext 1.20.13、Wrangler 4.148.0，使用 Node 22 或更新版本。默认验证命令不再需要例外参数。构建前从当前应用解析实际依赖，核对声明版本、安装版本与四处补丁摘要；未知版本或不完整补丁拒绝构建。发布记录包含该运行时检查结果。Router 不属于 Next 应用，本阶段未更新其依赖。

统一入口为 `scripts/require-app-runtime.mjs`，从应用目录无参调用，或在根目录运行 `node scripts/require-app-runtime.mjs --all`。主站保留 `require-patched-next.mjs` 兼容入口，内部委托统一门禁；CI 在构建与恢复部署产物前检查全部五个应用。

上一阶段的拒绝是真实观察，但不能直接等同于官方已停止支持所有 Next 15：当时 OpenNext 1.20.1 使用两年日期截止判断；2026-10-23 官方支持表仍列 15.x 为 Maintenance LTS，新版 OpenNext 已加入 Active/Maintenance LTS 判断，并将可接受的 15.x peer 下限提高到 15.5.28。证据、试验取舍与未迁移范围见 [S1.1 交付记录](../plans/multi-game-s1-runtime-closeout-2026-10-23.md)。

旧的 `--allow-unsupported-next-for-verification` 仍仅限本地诊断，不能用于 deploy；本阶段验收不使用它，也不把它加入 CI。全部五个应用的限定本地证据见 [S1.2 交付记录](../plans/multi-game-s1-runtime-rollout-closeout-2026-10-23.md)，不等于生产环境或全部游戏页面验收。

### 浏览器回归

先执行对应环境的默认 verify，再检查其已生成的本地产物：

```bash
pnpm --filter @gachia/game-nte verify:preview
node scripts/game-runtime-browser.mjs --game nte --environment staging
# production 模式对应 verify:bundle；仍然只启动本地 Worker，不部署。
pnpm --filter @gachia/game-azur-promilia verify:bundle
node scripts/game-runtime-browser.mjs --game azur-promilia --environment production
```

需要与锁文件中 Playwright 匹配的 Chromium（缺少时先运行 `pnpm exec playwright install chromium`）。覆盖桌面/手机、中英日角色列表、无 JS 阅读、延迟脚本后的筛选、客户端详情导航和返回；不等同于全站交互、登录或真实移动设备验收。浏览器仅访问启动的本地 origin，阻止外部请求，共用每游戏锁，并在退出时停止浏览器与 Worker。结果保存在 `.release-records/runtime-browser-<game>-<environment>.json`。

### 主站、原神和绿梦本地回归

先构建对应生产模式产物，再运行本地专用测试：

```bash
pnpm --filter @gachia/web exec opennextjs-cloudflare build --config wrangler.jsonc --env ""
node scripts/runtime-rollout-smoke.mjs web
pnpm --filter @gachia/game-genshin verify:bundle
node scripts/runtime-rollout-smoke.mjs game-genshin
pnpm --filter @gachia/game-lvmeng verify:bundle
node scripts/runtime-rollout-smoke.mjs game-lvmeng
```

此脚本不构建、不部署。每次创建独立本地配置与状态目录，不继承真实 D1/R2 标识、服务绑定或路由。主站测试在新建本地 D1 应用仓库迁移、写入合成账号并验证会话及收藏，不连接线上业务数据库。Google OAuth 禁用，只验证错误恢复；不能据此宣称真实 OAuth 已验收。记录位于 `.release-records/rollout-<app>-<uuid>/result.json`；合成凭据、种子 SQL、日志及本地库不提交。运行前应确认已有构建为生产模式；同一应用不要并行重建。

## 5. 远程操作：仅在满足发布前置条件后

下列命令会写入 Cloudflare Worker 和静态资源，不是只读检查。S1.3 仅实际执行了蓝色星原 `deploy:staging` 一次，未执行生产命令。

```bash
# 只更新对应 staging Worker，不修改 Router。
pnpm --filter @gachia/game-nte deploy:staging
pnpm --filter @gachia/game-azur-promilia deploy:preview

# 生产示例：必须先独立核对实际服务、当前承载、可回滚 UUID 和审批范围。
pnpm --filter @gachia/game-nte deploy \
  --confirm gachia-game-nte \
  --rollback-version <operator-verified-version-uuid>
```

占位 UUID 不可直接使用。要求精确确认是误操作门禁，不是线上版本真实性证明。生产 Worker 已由 Router 绑定时，更新该 Worker 会影响生产流量，即使没有重新部署 Router。

没有自动 rollback：如果上传/部署返回失败，平台可能已产生副作用，记录为 `deployment_failed_needs_reconciliation`，由操作者读取实际云端状态后决定恢复。不得自动重试同一发布。

### 独立 staging 的只读验收

```bash
node scripts/game-staging-acceptance.mjs --game azur-promilia --subdomain aieasygames
```

该命令不构建、不部署、不发送认证凭据、不跟随 HTTP 重定向，只访问构造的 `https://gachia-game-<game>-staging.<subdomain>.workers.dev`。覆盖三语言正文/索引/资源/404，以及桌面手机有/无 JS、筛选与详情导航。浏览器只允许同源 GET/HEAD，并有 1,000 次请求上限；不得用于压力测试。单元测试使用注入的模拟响应，不访问远程。

仅当本机已有可用代理时，可显式设置 `HTTPS_PROXY` 并使用 Node `--use-env-proxy`，另用 `STAGING_CHECK_PROXY` 为测试 Chromium 指定同一本地 HTTP 代理；不会自动修改系统网络或禁用 TLS 校验。输出在 `.release-records/staging-<game>-<uuid>/`，包含成功或失败记录及限定截图。脚本不核实云端版本、路由和生产前后状态，这些需要独立 API 对账，不能仅凭 HTTP 通过宣称发布完成。

## 6. 本地记录与并发限制

记录位于仓库根 `.release-records/`，已加入 Git 忽略。包含计划、配置哈希、HEAD、工作区是否有改动、阶段事件和本地验证结果，不保存凭据。

```bash
pnpm release:game status --record .release-records/<record-file>.json
```

常见状态：

| 状态 | 含义 |
|---|---|
| planned_not_executed | 只读计划，没有运行命令 |
| building / checking_artifacts | 构建或本地校验进行中 |
| bundle_verified_not_deployed | 本地验证与 dry-run 通过，没有部署 |
| deploying | 已开始可能写云端的命令，结果待核对 |
| deployment_command_succeeded_verification_pending | CLI 命令成功，但没有验证候选 UUID、流量或线上页面 |
| failed_before_deployment | 在调用部署前失败 |
| deployment_failed_needs_reconciliation | 已开始部署或部署后记账失败，需要读取云状态 |

`status` 只读取本地记录，不访问 Cloudflare，也不把记录升级为 `released`。记录是排障证据，不是完整源码或全部资产的供应链证明。

同一工作区、同一游戏的受控命令共用一个锁，避免 staging 与 production 同时覆盖同一构建目录。不同工作区、原始 CLI 或其他 CI 不受该锁保护；跨环境发布串行化属于后续发布管理工作。进程异常终止后保留锁，不自动按 PID 或年龄清除；先确认对应任务及子进程已停止、实际发布状态已对账，再由维护者处理该锁。

## 7. 为什么额外生成 namespaced assets

实际本地 Worker 冒烟发现：页面引用 `/_games/<game>/_next/...`，但 OpenNext 产物只有 `/_next/...`。线上 Router 可剥离前缀，直接 staging origin 没有 Router，页面 HTML 可成功但脚本返回 404。Next rewrites 不足以保证该 Worker 静态资源路径生效。

四个独立游戏构建后为生成的 `_next` 小目录增加 namespaced 副本，同时保留原路径：

```text
.open-next/assets/_next/...
.open-next/assets/_games/<game>/_next/...
```

不复制游戏数据和图片，不编辑生成的 Worker 源码，不改变 Router 约定。两种路径均在本地检查；生产仍保留 Router 使用的原路径。该步骤发生在本地构建输出，不修改源码资源。

`prepare-assets` 允许四个游戏，但 `plan`、`verify`、`deploy` 仍只允许异环和蓝色星原。原神、绿梦只是复用本地资源准备能力，并未因此获得受控远程发布权限。原神本地 preview 显式选择 staging；绿梦生产构建与 dry-run 显式选择 production，未新增 staging 服务。

## 8. 云端验收清单与已复核边界

- [x] 全部五个 Next 应用默认构建、运行时精确版本与自定义补丁的限定本地回归通过。
- [x] S1.3 核对真实账户、目标环境、现有权限与当前版本；Paid 套餐与 Actions 预算通过已登录控制台只读确认。
- [x] 蓝色星原 staging 实际部署后检查 noindex、robots、正文、canonical、JS/CSS、404；异环及其他应用仍需各自验收。
- [x] 本次 staging 部署前后确认六个生产服务版本与生产路由未变。
- [ ] 生产候选的版本、承载流量与回滚 UUID 真实可用。
- [ ] 切流后通过统一域名核验 Router、资源和关键页面。

入口复核：原神已有独立 staging 配置，绿梦无同名 `deploy:preview` 别名；二者未接入本门禁。绿梦默认配置名仍是生产服务，直接使用默认配置不能解释为安全预览。主站与 Router 的 staging/production 流程继续遵循其原有门禁，不根据本阶段测试推断全站环境隔离已经完成。

S1.3 新发现：主站 staging 缺少两个 Google OAuth secret；Router staging 的云端配置与本地声明不同。本批未修改这些服务，不能借蓝色星原直连验收放行主站或 Router。新游戏预览地址的 noindex 不是身份认证，不应存放非公开资料。
