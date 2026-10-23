# Game Release Safety：S1 本地发布门禁

更新：2026-10-23。范围仅为异环与蓝色星原的受控包脚本，不是全站发布平台，也不是已经完成云端验收的声明。

## 1. 本阶段解决什么

- `deploy:preview` / `deploy:staging` 固定使用独立 staging Worker，不再调用默认生产目标。
- staging 的服务名、模式和公共 canonical 来源必须显式配置，不继承缺失值。
- 构建与部署使用相同的显式 Wrangler 配置和环境，阻止未知 CLI 参数透传。
- 预览默认禁止索引，校验实际生成的 robots、响应头及 HTML，而非只检查源码字符串。
- 部署前启动本地 Worker，检查真实服务端正文、canonical、真实详情、JS/CSS 与 404。
- 生产执行要求精确服务名确认和操作者提供的回滚 UUID；工具不会冒称已经验证云端 UUID。
- 写入本地状态记录，严格区分构建、检查、执行部署命令和线上验收。

未修改主站、Router、原神和绿梦的发布目标或生产流量；没有创建远程 staging 服务。独立 staging 配置仅在未来实际执行远程部署时创建或更新对应服务。

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

### 当前试点运行时与历史阻断

S1.1 将两个试点精确锁定为 Next.js 15.5.28、OpenNext 1.20.13、Wrangler 4.148.0，使用 Node 22 或更新版本。默认验证命令不再需要例外参数。构建前从当前应用解析实际依赖，核对声明版本、安装版本与四处补丁摘要；未知版本或不完整补丁拒绝构建。发布记录包含该运行时检查结果。

上一阶段的拒绝是真实观察，但不能直接等同于官方已停止支持所有 Next 15：当时 OpenNext 1.20.1 使用两年日期截止判断；2026-10-23 官方支持表仍列 15.x 为 Maintenance LTS，新版 OpenNext 已加入 Active/Maintenance LTS 判断，并将可接受的 15.x peer 下限提高到 15.5.28。证据、试验取舍与未迁移范围见 [S1.1 交付记录](../plans/multi-game-s1-runtime-closeout-2026-10-23.md)。

旧的 `--allow-unsupported-next-for-verification` 仍仅限本地诊断，不能用于 deploy；本阶段验收不使用它，也不把它加入 CI。主站、原神、绿梦仍使用旧运行时，不能从两个试点的成功推断全站运行时已完成升级。

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

## 5. 远程操作：仅在满足发布前置条件后

下列命令会写入 Cloudflare Worker 和静态资源，不是只读检查。本阶段没有执行。

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

受控构建后为生成的 `_next` 小目录增加 namespaced 副本，同时保留原路径：

```text
.open-next/assets/_next/...
.open-next/assets/_games/<game>/_next/...
```

不复制游戏数据和图片，不编辑生成的 Worker 源码，不改变 Router 约定。两种路径均在本地检查；生产仍保留 Router 使用的原路径。该步骤发生在本地构建输出，不修改源码资源。

## 8. 云端验收清单与已复核边界

- [x] 两试点默认构建、运行时精确版本与自定义补丁的限定本地回归通过；其他应用待独立迁移。
- [ ] 核对真实账户、目标环境、凭据权限与当前版本。
- [ ] staging 实际部署后检查 noindex、robots、正文、canonical、JS/CSS、404。
- [ ] 发布前后确认生产版本未被 staging 修改。
- [ ] 生产候选的版本、承载流量与回滚 UUID 真实可用。
- [ ] 切流后通过统一域名核验 Router、资源和关键页面。

入口复核：原神已有独立 staging 配置，绿梦无同名 `deploy:preview` 别名；二者未接入本门禁。绿梦默认配置名仍是生产服务，直接使用默认配置不能解释为安全预览。主站与 Router 的 staging/production 流程继续遵循其原有门禁，不根据本阶段测试推断全站环境隔离已经完成。
