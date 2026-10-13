# 本地内容工作台：执行隔离实施方案

日期：2026-10-11核对。状态：I1已实现，I2/I3部分完成，I4/I5未完成，尚无OS隔离。用户确认本机没有Docker并选择方案一：暂缓真实隔离接入，继续非Docker产品工程。不安装运行时、不修改系统权限、不启动容器、不批准真实草案。

当前已交付源材料/元数据/身份计划/契约、schema v12控制面租约与身份状态机、预算/staging规范、内部本地字节核验及有界Mac只读发现；没有可信Linux制品、实际composer/daemon/runner或真实启动/停止/释放链，effectiveLimits=null。正文分阶段记录保留开发过程，其中“下一步”建议以本节及第9.1节的最新暂缓决定为准。当前产品任务顺序见 `docs/local-game-content-workbench.md` 第16节；2026-10-11管理端回归118项通过，独立浏览器6项及桌面/移动冒烟通过，均不代表I4实测通过。

后续非Docker历史分页阶段已将数据库升级目标推进至schema v13（仅增加来源/游标索引），管理端回归119项通过，浏览器6项及桌面/移动冒烟通过。下文v11/v12指对应隔离切片引入的历史版本；这次升级不增加运行时权限，也不改变真实隔离暂缓状态。

## 1. 核对结果与选型

当前主机为 macOS（Darwin）。只读 PATH 检查未发现 docker、podman、colima 命令；这不证明机器完全没有虚拟化软件，也不确认任何后台运行时状态。

推荐采用独立 Linux 容器运行时（macOS 下由虚拟机承载），作为可替换执行适配器。先完成能力探测和默认拒绝门禁，再由用户选择并安装运行时，最后验证隔离执行。首版不使用已弃用的 macOS sandbox-exec 作为生产承诺，不把独立 Git worktree、环境变量清理或浏览器拦截称为 OS 沙箱。

无法使用 Linux 容器时，保留现有显式风险确认的可信代码预览；模式必须标为 legacy_trusted_local，不得自动降级或显示“已隔离”。更强的恶意代码隔离需另评估微虚拟机/独立虚拟机，容器本身也不等于绝对安全。

## 2. 当前能力与真实缺口

依据 `apps/admin/src/application-preview.mjs`、`workspaces.mjs` 与 README 核对：

| 边界 | 当前实现 | 缺口 |
|---|---|---|
| 执行输入 | 当前接受的审核材料、工作区范围、固定 Next 命令；禁止自由 shell | 包含基线代码、Next配置和依赖的完整可执行材料没有不可变运行镜像摘要；启动前检查不能防止启动后外部改写 |
| 文件 | 独立工作区、CLI realpath 在工作区内、根/app .env 阻断 | 同一用户进程仍可读取主目录、其他仓库和凭据，也能写出工作区；检查不是访问控制 |
| 环境 | 白名单 env、隔离 HOME/TMPDIR、不传工作台token/继承NODE_OPTIONS | 不能阻断磁盘凭据、系统钥匙串或 Unix socket 访问 |
| 网络 | Next绑定127.0.0.1；测试浏览器仅允许预览origin，阻断/api | Node服务端及子进程可外连；浏览器策略不约束服务端；本机其他进程可访问端口 |
| 资源 | 单预览、10分钟、Node堆1024MiB | 无总RSS/CPU/进程/磁盘硬上限；堆上限不是进程总内存限制 |
| 停止 | 拥有的进程组TERM/KILL、审核漂移停止 | setsid/逃逸后代不能保证清理；主进程先退出时后代存活风险仍在 |
| 恢复 | SQLite持久状态、重启后needs_reconciliation、不杀旧PID | 没有隔离实例身份/镜像/租约对账，也没有跨服务实例执行锁 |

## 3. 目标执行契约

提供三个明确模式：disabled（仅数据预览）、legacy_trusted_local（现有风险确认路径）、isolated_linux（探测及验收通过才可用）。禁止将用户输入直接拼成容器命令、镜像标签、挂载目录、端口或网络策略。

可信控制面在宿主机维护数据库、审核和生命周期。工作负载容器不得挂载主仓库、Git公共目录/.git文件指向的路径、工作台数据库、用户主目录、钥匙串、SSH agent或容器运行时socket。运行时socket只允许控制适配器访问，日志不导出凭据。

### 3.1 冻结运行材料

- 从已审核快照生成独立运行副本，剔除 .git、所有 .env/凭据、宿主缓存及不允许路径；拒绝符号链接逃逸和特殊文件。
- 对完整可执行副本计算清单摘要，包括源码、Next配置、package清单/锁、必要数据及构建器版本；记录基线提交和草案packetDigest。仅原始JSON变更清单不足以代表所有运行输入。
- 依赖必须在单独、明确授权的准备阶段用固定Linux平台和锁文件预备，不联网安装、不执行任意安装脚本；macOS node_modules不能直接当作Linux依赖。依赖/脚本风险另审。
- 使用固定不可变镜像digest；只读挂载冻结副本。写缓存仅在实例私有临时目录，不能覆盖审核材料。运行后宿主副本变化即使内容相同也需按策略重新核验。

### 3.2 网络与浏览器拓扑

- 容器使用无外网出口的内部网络，禁止宿主机/云元数据/公网访问；未验证IPv4/IPv6/DNS实际阻断前不得通过能力探测。
- Next在容器内监听固定接口/端口，仅映射到宿主127.0.0.1的系统分配端口；不发布0.0.0.0宿主端口，不映射管理服务。
- 采用内部网络并映射端口的方案需单独验证选定运行时的实际行为；不能假设 `--network none` 同时支持宿主端口映射。运行时不支持该拓扑则拒绝启动，另选网络命名空间或受限代理方案。
- Playwright仍在控制面，使用现有local-origin路由限制；容器内监听0.0.0.0只限容器网络，不可与宿主公网监听混淆。

### 3.3 资源和权限

初始候选预算：单实例、10分钟、总内存2GiB、CPU2核、PID128、临时缓存1GiB；均为待实测调优的目标，不宣称当前已生效。

- 非root UID、无额外capability、no-new-privileges、只读根文件系统、默认seccomp、不使用privileged/host网络/host PID或设备挂载。
- 临时目录设明确大小；不保证运行时默认磁盘配额。容量控制不支持则探测失败或禁用该模式，不能静默忽略。
- 超时/停止作用于唯一隔离实例及其全部后代；清理容器/私有缓存不影响草案。清理失败进入待对账，不自动复用未知实例。
- OOM、CPU限制、PID耗尽、磁盘超限、用户停止、审核漂移、进程退出分别记录原因。保留安全摘要，不持久化未经脱敏的stdout/stderr。

### 3.4 身份与恢复

持久记录instanceId、随机ownershipNonce、runtimeId、imageDigest、materialDigest、packetDigest、有效预算、端口与生命周期。实例携带不可伪造性不能仅依靠可修改label；至少校验实例ID和宿主持久记录，并将同用户runtime管理权限风险写入边界。

启动先预留执行租约，保存意图，再创建实例；两个控制进程不能同时启动。重启先查询实例状态，不按旧PID或仅名称操作。标签/摘要不匹配拒绝终止，要求人工对账。任何重试不得覆写旧审批/实例记录。

## 4. 分阶段交付

| 切片 | 交付 | 验收与停止条件 |
|---|---|---|
| I1（已实现） | 只读能力探测、隔离策略对象、明确模式及报告 | 默认disabled；固定路径文件探测不执行CLI；即使命令存在也拒绝isolated_linux；旧可信路径须明确模式和风险确认，无自动降级 |
| I2（源材料及静态范围检查已实现，完整执行输入待完成） | 冻结材料生成及摘要验证 | 源码/配置/锁/数据冻结及前后摘要、失效检查、清单绑定的TS AST导入和JSONC配置检查已实现；不含node_modules、Linux依赖镜像及运行时digest，不能执行；完整输入和更强并发改写防护仍待后续 |
| I3（部分完成，真实接入暂缓） | 固定执行适配器与数据库实例/租约迁移 | schema v12及升级备份、事务互斥意图、owner校验/续租/启动前取消、过期待对账不接管、启动意图与身份状态记录已实现；身份仅声明未实际核验。实际启动/停止、可信对账释放、有效预算映射及适配器未实现 |
| I4（未完成，暂缓） | 网络/文件/资源隔离实测 | 运行时安装另行批准；全部隔离测试通过才开放该模式，当前模拟不作为验收 |
| I5（未完成，暂缓） | 隔离模式真实Next及界面接入 | 三语页面/搜索验收继续通过，显示实际effectiveLimits与模式；现有legacy预览不算本项完成，仍不授予发布权限 |

## 5. 必须验证的故障矩阵

- 文件：读宿主哨兵、工作台DB、.ssh、主仓库；写宿主哨兵；符号链接与挂载逃逸；均拒绝。
- 网络：公网域名/IP、IPv6、localhost宿主服务、metadata IP、DNS与socket访问均拒绝；仅批准的预览入口可达。
- 权限：提权、访问运行时socket、host进程/设备均拒绝；子进程不能突破策略。
- 资源：内存/CPU/PID/磁盘压力；实际硬上限可观测，停止后无后代残留。
- 生命周期：主进程先退、子进程新会话、服务kill/重启、端口冲突、材料漂移、实例ID不匹配、并发控制面；结果不明必须待对账。
- 功能：冻结副本中的Next启动、受影响页/目录/索引与桌面/移动搜索通过；不自动下载字体/依赖绕过外网阻断。

测试必须使用临时哨兵和专用实例，不尝试读取真实用户凭据。模拟测试与运行时实测报告分开；缺少某种后端时标未覆盖，不写成已隔离。

## 6. 待明确决策

运行时产品及安装授权、镜像来源/digest和构建维护、Linux依赖准备方式、资源预算、缓存保留期限、容器安全能否满足信任模型。I1可先进行，不需要安装运行时；I3/I4不得自行改变系统设置或下载运行镜像。

P0真实公告人工审批不因本方案而完成。该方案仅解决未来代码执行边界，不批准事实、草案或发布。

## 7. I2静态输入范围与Linux准备契约

冻结记录的`inputScope`绑定材料digest，使用工作台自带TypeScript解析器，只读取已核验的清单字节，不导入项目模块或执行配置。检查静态import/export、字面量require/import、JSONC的extends/paths、package本地依赖和workspace包存在性。问题列表最多200条，完整问题计数保留；截断不能变为通过。缺失/越界/语法或配置问题为`needs_attention`；其余最多`partial_pass`，从不授予执行权限。旧记录未扫描时显示“未检查”。

未覆盖：计算加载、require别名、任意文件读取、URL/CSS资源、第三方插件、条件exports/imports、workspace YAML枚举、锁文件闭包和Linux原生依赖。包脚本仅记录未覆盖，不解释为固定Next入口必需的输入，也不执行。副本或审核漂移仍由assessment标记stale，历史扫描报告不是当前许可。

Linux依赖镜像后续准备必须形成以下不可缺项的独立材料记录（本轮仅制定契约，未实现准备器）：

- 明确受审来源、不可变镜像SHA-256 digest、Linux平台/架构，以及精确Node/pnpm版本；不得使用浮动tag作为验收身份。
- 绑定源材料、审核包、pnpm锁文件摘要与依赖安装策略；必须报告workspace覆盖、条件导出、原生模块与运行时资源缺口。
- 安装仅在另行批准的隔离准备环境进行，禁用生命周期脚本；确需脚本/网络时单独审查授权、固定制品及来源，不沿用宿主node_modules，不传入宿主凭据。
- 记录实际依赖制品摘要、构建日志摘要、验证结果和全部未覆盖项；安装成功不等于镜像可信，不等于隔离测试通过。
- 执行阶段不安装依赖、不联网补齐资源，材料与镜像只读；摘要、平台、审批或资源缺项一律拒绝执行，禁止回退宿主。

### 7.1 显式源材料排除（已实现）

默认冻结仍拒绝所有.env含模板。新增独立按钮及`POST /api/execution-materials/exclusions`，只允许固定路径`apps/web/.env.example`作为候选，不接受自定义路径、通配符或其他凭据排除。候选必须是预算内普通文件，符号链接和目录仍拒绝。扫描为计算摘要读取模板字节，不解析、不返回或记录原文值，只展示路径、字节数、SHA-256与固定原因。

确认清单绑定reviewId、packetDigest及全体源材料/排除摘要；用户可取消，确认时通过`confirmExclusions:true`与`exclusionDigest`单独提交。源文件、排除文件或审核变化均要求重新检查，复制前后仍复验源材料；排除文件绝不复制。源材料清单升级为v2，contentDigest绑定实际复制文件，material digest同时绑定排除元数据；旧v1历史记录继续支持副本复验，不迁移其历史摘要。

记录保留确认时间及完整排除清单，静态检查明确列为未覆盖，execute/publish仍为false。副本重新出现.env或文件漂移则stale；不追踪冻结完成后源模板的后续编辑，历史摘要记录冻结当时的输入。此确认不是无凭据证明，也不是完整输入闭包或依赖许可。

只读检查当前工作树已得到1847个拟复制文件（66008317字节），排除1个573字节模板；未生成真实草案冻结记录、未替用户进行人工审批。I2下一项仍是workspace/锁依赖闭包与Linux依赖制品身份记录，准备器、运行时及OS隔离未实现。

本切片回归：工作台测试66通过、6浏览器项跳过；独立浏览器套件6通过，1440px/390px通用冒烟通过。专门覆盖排除确认取消/接受、源/排除/审核漂移、凭据及链接拒绝、API鉴权和旧v1兼容。测试草案及审核均为临时夹具，不代表真实公告已获批准。

### 7.2 workspace与锁依赖元数据检查（已实现，非完整安装闭包）

冻结记录新增`dependencyScope`，绑定材料digest并展示在历史记录。使用YAML结构化解析器检查固定apps/*、packages/*范围、pnpm v9 importer与包声明specifier一致性、workspace本地目标及包名、可达dependencies/optionalDependencies snapshot、peer限定键和制品integrity元数据存在性。循环去重，预算10000节点/50000边；问题列表最多200项，保留总数。非法/重复YAML键、过量alias、未知tag、缺失节点或不支持协议明确needs_attention，不执行安装或配置。

当前工作树只读检查：6个包含importer、6个未包含importer、975个可达snapshot、2220条边，结果partial_pass。未包含其他apps明确报告，因此不能宣称整个workspace可frozen安装。该数值仅为当次材料快照，不是Linux依赖准备结果。

未覆盖peer满足、override/catalog/patch/hook及安装设置语义、平台筛选、实际制品下载及摘要验证、原生模块/布局；integrity字符串仅为锁中声明，非实际制品验签。旧记录无报告显示未检查，schema仍v10。下一步为Linux依赖制品身份的结构化计划/校验记录，再由另行授权的准备器和隔离实测补齐；不能以元数据检查替代运行时验证。

### 7.3 Linux依赖身份计划（已实现，制品未验证）

每个当前冻结材料提供独立计划表单和鉴权POST `/api/execution-materials/dependency-plans`。仅记录registry/repository@sha256完整引用、显式linux/arm64或linux/amd64、精确Node/pnpm版本、无凭据/查询/fragment的HTTPS来源说明链接及计划说明。Node至少22.18.0；pnpm须与冻结根packageManager完全一致。来源不请求，镜像不拉取，版本不探测，不执行任何命令。

计划绑定materialId/digest、reviewId、packetDigest和锁文件SHA-256；固定禁用安装脚本、宿主依赖/凭据及运行时网络/安装。字段格式合法只产生metadata_valid_only，状态planned_unverified；artifactVerified/imageInspected/linuxTested和prepare/execute/publish权限全部false。填写的摘要、版本、平台及来源都是用户声明，不是实际制品认证。

schema维持v10，在现有材料JSON追加计划。规范化后相同计划去重，修改生成新ID及时间，不覆盖旧计划，每份材料上限20条；保存前后复验材料及审核，失效则拒绝新增并将历史绑定显示stale。历史没有计划仍可读。持久化使用现有单进程同步读写；跨实例追加原子性和租约未实现，不得多控制进程同时修改同库。

后续优先实现只读计划就绪度/缺项报告及依赖准备器的输入输出契约，再在单独授权后接入实际镜像检查/准备器、I3租约及I4隔离测试。当前没有依赖制品、构建日志摘要、Linux原生依赖验证或真实镜像验证，I2仍不能标为完成。

### 7.4 准备就绪度及规范导出（已实现，准备器未实现）

每次读取派生`readiness`，复验材料assessment、plan身份摘要、material/review/packet/lock绑定与扫描报告摘要；计划字段变化不会继续显示current。绑定匹配也只能blocked_unverified，失效为stale。明确列出未检查/失败/局部范围、遗漏importer、模板排除影响、实际镜像/制品未验证、准备器/授权/租约/预算缺失及OS隔离未测试。不能通过填写artifactVerified或linuxTested清除缺项。

提供鉴权POST `/api/execution-materials/preparation-contract` 和浏览器JSON下载。当前绑定可导出用于评审，stale拒绝409；导出不是准备许可。规范含固定plan身份、源文件摘要清单、排除元数据、扫描报告、缺项与独立授权/跨实例租约/隔离/网络要求，摘要绑定内容，不含宿主路径、原文文件或凭据。所需输出包括输入身份回显、实际镜像/平台/版本、制品清单及字节核验依据、有效预算/实例归属、脱敏日志摘要、原生依赖验证及完成/失败/取消/待对账状态。

本切片仅机器可读的规范和就绪度；没有输出导入API、制品验证器、准备授权或可执行适配器。不得粘贴一份自报成功JSON即标制品已验证。离线导出会过期，未来可信适配器必须复验全部输入并验证实际字节；prepare/execute/publish始终false，schema保持v10。

下一步可在不安装运行时的前提下推进I3执行意图/跨实例租约及恢复对账的数据库与测试切片，先解决同库并发控制和归属问题；真实镜像检查、准备器与隔离测试仍需单独授权及可用运行时，不以继续开发自动视为安装批准。

## 8. I3控制面租约基础（已实现，非运行时保护）

schema v11新增execution_intents及单个isolated_linux_preparation活动槽部分唯一索引。升级前保留SQLite备份；迁移须停其他控制进程，不支持并发首次升级。已初始化同库中通过BEGIN IMMEDIATE序列化跨连接/进程预留；reserved与needs_reconciliation共同占位。requestId相同且owner及材料/计划身份相同仅返回旧记录，不刷新租约或变成授权。

内部store API仅reserve/heartbeat/cancelBeforeLaunch/list，无HTTP修改入口，不触发运行时。租约1000..60000ms；owner instance与随机256bit nonce归属检查，nonce仅存SHA-256，不通过状态接口返回。当前为数据库归属防误操作，不防同用户读写数据库。材料/计划摘要在此层仅是不透明绑定，未来可信适配器必须先复验及独立授权，不能直接调用预留即视为可执行。

读取/操作发现到期转needs_reconciliation并保留槽，重启不按PID推断已清理，不自动接管；过期owner及其他owner不能续租或取消。活owner仅可启动前取消（本切片根本没有启动路径）。对账释放API尚未实现，异常占位会故意阻塞；待真实runtime身份与资源残留验证后才能实现可信释放。系统时钟回退可能延后到期，不代表强生命周期截止。

状态API及隔离面板只读展示脱敏记录，所有prepare/execute/publish仍false。测试覆盖两独立进程同时争抢仅一个成功、跨连接owner冲突、幂等/续租/取消、owner退出后过期仍阻塞、重开数据库及v10备份迁移。没有实际进程/容器残留检查。legacy预览、官方采集、计划JSON追加均未接入该租约，不宣称它们获得跨实例保护。

I3剩余：可信适配器、运行实例身份/ownershipNonce、启动前持久意图到创建结果的状态机、预算映射、经过身份核验的停止/对账释放。I2实际制品与I4隔离实测仍待批准环境。本轮未安装运行时、拉取镜像或启动容器。

本切片最终回归：82通过、6浏览器项跳过；独立浏览器套件6通过，1440px/390px冒烟通过；租约专项6项覆盖跨连接/进程、owner退出、输入拒绝及迁移备份，语法及差异检查通过。所有运行记录来自临时测试库，不新增真实执行许可。

### 8.1 启动意图与实例身份状态机（已实现，未接入运行时）

schema v12迁移先备份，重建意图表扩展launching/identity_recorded及runtime_payload，保留v11活动owner与历史。内部beginLaunch仅接受有效reserved owner，先持久化随机launchAttemptId、声明的docker/podman、摘要镜像、Linux平台及独立runtime nonce摘要；无实际运行命令。进入launching后禁止启动前取消，避免结果不明时释放。

recordLaunchResult严格绑定owner、attemptId、runtime nonce、镜像/平台/运行时；仅接受identity_reported完整64hex实例ID或unknown。身份重复结果幂等，替换实例ID/第二次启动拒绝。identity_recorded仅为声明，不是核验；启动意图之后runtimeCreated=null、identityVerified=false，不能据此声称实例存在或不存在。unknown立即待对账；launching/identity_recorded过期同样待对账占位，重开数据库保留身份，不按PID或短名释放。状态输出不含两类ownership摘要/nonce。

此切片没有HTTP修改入口、实际create/inspect/stop、材料/独立授权的可信适配器或对账释放；prepare/execute/publish仍false。下一步应实现只读身份匹配/停止前核验契约及故障矩阵，为可信适配器接入做准备；不能将内部写入身份测试当真实容器隔离验收。

本切片最终回归：86通过、6浏览器项跳过；1440px/390px通用冒烟及桌面/移动审核/冻结/计划/契约专项通过。意图专项10项含启动身份错误/覆写拒绝、未知/无返回/过期占位、v11迁移保留owner；语法与差异检查通过。真实运行时仍未调用。

### 8.2 只读身份匹配与停止前核验规范（已实现，无inspect/stop适配器）

内部compareObservation使用持久化身份及私有runtime归属hash比较intent/attempt/runtime/full instance/image/platform/controller/plan字段；缺少完整实例ID、absent/unknown、任何身份冲突、nonce不符、未知运行状态、未来或超过5000ms观察均拒绝。全部声明相符也仅claims_match_only，identityVerified及stop/release/execute/publish仍false。函数不请求daemon、不持久化观察，不提供HTTP观察上传；测试声明不是运行时证据。

鉴权POST `/api/execution-intents/inspection-contract` 与隔离面板提供摘要绑定的只读JSON下载，包含脱敏预期身份、缺项、观察字段/时效/nonce内部处理要求及停止前重新核验规则。缺失或过期身份也可导出用于评审，但不得操作；过期状态在导出中派生，不修改DB或释放槽。导出不含归属hash/nonce，schema保持v12。

可信适配器尚未实现，镜像多平台index与实际平台digest需未来解析，label不是归属证明；absent结果不能证明启动未发生或资源已清理。实际daemon检查、可信停止、后代/挂载/网络残留核验和对账释放仍待完成。下一步可补固定运行时只读检查适配器的参数/输出解析及模拟故障测试，先不执行CLI；实际环境调用仍需单独授权。

本切片回归90通过、6浏览器项跳过；桌面/移动审核/冻结/契约专项通过并读取下载JSON确认stop权限false。故障矩阵及API鉴权/不存在/无停止入口测试通过，语法及差异检查通过。所有观察为夹具声明，无真实daemon核验。

### 8.3 固定只读检查参数/输出解析（已实现，无CLI执行器）

内部inspectProfile/compareInspectResults从DB读取身份，生成固定allowlist可执行路径及container inspect完整ID、image inspect摘要引用的参数，不接受自由命令，不使用shell。5秒和每stdout 1MiB为规范预算，未执行子进程因此不是实测硬限制。核验契约包含profile、label字段约定及原始输出处理要求，无HTTP输出上传或运行入口，schema仍v12。

解析只接收成功且完整的单对象JSON数组，拒绝超限、非空stderr、timeout/signal/truncated、结构未知或错误；失败始终unknown，不通过错误字符串推断absent。匹配容器完整ID、容器Image与镜像Id关联、RepoDigests、Linux架构和运行状态一致性后，再对照持久化身份/归属nonce。原始inspect可能含Env/凭据，内存解析后只返回固定代码和比较报告，不持久化、导出或记录原始内容/错误。

即使参数与夹具全部相符仍仅claims_match_only；未验证daemon端点/context、可执行文件可信性、镜像签名、多平台index到平台manifest映射或真实Docker/Podman版本输出。标签不是归属证明；未知字段/版本模式应拒绝而非猜测。实际runner、sanitize环境、硬预算执行与可信inspect/stop/release均未实现，所有权限保持false。

下一步优先补daemon端点与执行环境的固定策略、检查结果与lease/attempt的时序绑定，仍先采用模拟执行器；实际运行时调用与环境安装需另行授权。

本切片回归94通过、6浏览器项跳过；桌面/移动审核/冻结/规范下载专项通过；解析专项覆盖docker/podman模拟结构、错误/多对象/超限/时间异常、身份/镜像/平台/label/状态冲突及敏感内容不返回。语法及差异检查通过，无实际CLI调用或daemon连接。

### 8.4 固定daemon策略与模拟检查会话（已实现，非真实runner）

仅接受显式docker_linux_system或podman_linux_system策略：固定Unix socket、全局host/url参数、cwd及仅LANG/LC_ALL环境，不继承HOME/PATH/DOCKER_CONTEXT/DOCKER_HOST/CONTAINER_HOST或凭据，不自动回退。Mac Desktop/rootless策略、socket/daemon身份核验、私有空config/cwd准备及Podman配置隔离未实现；当前Linux策略不代表可在Mac实际运行。

内部simulateInspection从DB取完整快照，要求identity_recorded及有效租约，在模拟container/image检查前、中、后对照相同快照和租约；跨连接续租也保守判失效，启动attempt/实例或状态变化不允许沿用旧结果。整个会话显式simulatedOnly且只能注入模拟回调，无spawn/socket/HTTP入口，错误不返回原文、结果永远simulated且未核验。schema仍v12，不持久化观察、不改意图或释放槽。

快照比较不是跨异步操作持有租约锁或ABA防护版本计数，不保护之后stop等动作。真实执行器硬超时/字节限制、daemon固定与配置隔离、可信身份验证及行动前再次核验仍待实现；所有权限保持false。下一步需明确Mac运行时产品/daemon来源与独立授权，再决定真实只读runner接入；无运行时条件时可继续补预算/执行协议，不能以模拟通过宣称隔离完成。

### 8.5 目标预算与固定启动协议（已实现，非启动命令生成器）

集中定义2GiB/2CPU/PID128/临时空间1GiB/10分钟目标预算，策略与协议共用。提供鉴权GET `/api/execution-launch-protocol` 和浏览器JSON下载；内容摘要稳定，effectiveLimits=null，所有create/start/prepare/execute/stop/release/publish为false，schema仍v12。

Docker Linux-system离线探测模板映射memory/memory-swap、CPU/PID、只读根、非root UID、cap-drop/no-new-privileges、禁止pull/log、固定tmpfs、只读源材料占位符及固定Node/Next start入口。镜像/宿主源路径均保留不可直接运行占位符，不接受自由参数，不提供执行器。Podman参数仍标unsupported，不假定Docker语义通用。

协议要求先持久意图再create、记录完整实例ID、核验实际设置再start；授权、有效租约、可信Linux制品及prebuilt Next均为前提。network none仅离线探测，不发布端口，不宣称实现浏览器预览；内部网络/loopback代理需另设计验证。只读.next/cache布局未解决，tmpfs不是总磁盘配额，10分钟需持久控制面截止而非CLI标志。cgroup/swap/seccomp、daemon侧挂载及后代清理待实测。下一步可补实际设置与目标预算的只读差异检查及故障矩阵，仍先用夹具不调用运行时。

本切片回归100通过、6浏览器项跳过；桌面/移动专项下载协议并验证create权限false、effectiveLimits为空，既有审核/冻结流程通过。目标预算共享、协议摘要稳定、返回对象不污染后续预算、API鉴权及参数边界测试通过；语法和差异检查通过，无真实容器调用。

### 8.6 离线实例设置差异检查（已实现，配置声明非实际限制）

Docker inspect解析加入settings子报告，对照离线模板的内存/swap/CPU/PID、非root/只读根、cap/security、私有namespace、无设备/额外挂载/端口、日志/重启/core、tmpfs、只读staging及入口/命令/最小环境。预期字段缺失或差异均拒绝，Podman不支持。staging仅接受固定私有目录UUID形式，语法匹配不证明daemon侧所有权或路径安全；当前意图未绑定已验证staging，因此不能清除此缺项。

身份status与设置status分开保留，overallStatus在任一不符时blocked；均相符也仅claims_only_unverified。报告只返回固定代码/目标值，无原始Env/路径/凭据。schema仍v12，effectiveLimits为空，start/execute/stop/release/publish为false。

未覆盖实际cgroup/压力测试、默认seccomp来源、Docker版本额外字段、子挂载竞态、总磁盘及持久截止；不能将已检查字段当完整配置安全allowlist。下一步建议处理已验证staging及制品挂载契约、或先核对剩余任务与Mac运行时选型，避免继续以配置模拟替代I4实测。实际运行时接入/安装仍需独立授权。

本切片回归103通过、6浏览器项跳过；桌面/移动预算导出及审核/冻结专项通过；最终staging UUID收紧后设置专项3项再次通过。故障矩阵覆盖预算/权限/namespace/网络/挂载/入口/环境与缺失字段，语法和差异检查通过。未调用daemon或执行容器。

### 8.7 源材料与Linux制品staging挂载契约（已实现，无实际composer）

2026-10-11新增鉴权POST `/api/execution-materials/staging-contract` 和每个计划的JSON下载。复验材料/审核/计划后绑定material/plan/packet/lock/image/platform身份与源文件摘要/排除，过期拒绝409。定义私有daemon路径模板及readonly/rprivate挂载，内容摘要稳定，不输出宿主源路径/原文；schema仍v12，未创建目录、复制或挂载制品。

内部制品元数据检查只接受apps/web/node_modules与apps/web/.next普通文件，20000文件/1GiB预算、444/555模式、SHA-256和Next CLI/BUILD_ID必要项。拒绝遍历/绝对/凭据路径、特殊文件/链接、重复/源文件冲突/文件目录碰撞、身份漂移及超预算；问题最多100条保留总数。元数据合法也仅metadata_only_unverified，artifactBytesVerified=false，所有stage/mount/start/execute权限false，无HTTP清单上传。

pnpm link/hardlink布局尚无安全实体化策略，不能静默跟随；自报digest不等于字节核验。未来可信composer须完整清单及前后字节核验、私有ownership/祖先link/子挂载检查和daemon侧路径映射，Mac路径不能当Linux VM路径使用。构建/原生依赖闭包、排除影响、可写cache及实际只读防改写均未解决。下一步建议实现仅临时夹具上的本地普通制品字节核验，仍不导入真实制品或解除执行门禁。

本切片回归107通过、6浏览器项跳过；桌面/移动专项下载staging规范并验证mount=false、createdNow=false，既有审核/冻结流程通过；清单身份/路径/碰撞/预算/摘要故障及API鉴权/过期拒绝覆盖，语法和差异检查通过。未复制真实制品或进行运行时调用。

### 8.8 本地普通制品字节核验（已实现，仅内部原语）

2026-10-11新增verifyArtifactBytes，先验证清单元数据，再在内部指定本地目录以O_NOFOLLOW读取普通文件，分块SHA-256、精确大小/权限、inode/device/nlink及读取前后时间戳匹配。两次完整扫描拒绝缺失/额外文件、未声明目录和扫描间变化，预算限制文件/读取字节/节点/深度；拒绝符号链接/祖先别名/硬链接/特殊类型及跨设备边界。只读，不复制、提取、chmod或创建staging。

本地快照全部相符仅local_bytes_match_only，artifactBytesVerified=true仅限这次本地双扫描，不是可信Linux制品来源或未来挂载认证。没有HTTP目录/制品导入、持久验证记录或执行许可；schema仍v12。报告仅固定代码/摘要，无真实宿主路径/原文/错误。实际测试仅使用临时夹具。

并发同用户祖先替换、同设备子挂载、核验后改写仍未完全覆盖；readOrdinary类检查不等于descriptor-relative完整TOCTOU防护。可信composer、不可改写staging、daemon侧映射及pnpm链接实体化尚未实现。下一步可整理当前隔离链路的集成缺口，选择Mac运行时与实际只读核验接入方案；不能继续把夹具通过当I4实际隔离验收。

本切片回归111通过、6浏览器项跳过；桌面/移动审核/冻结/staging下载专项通过；字节专项4项覆盖真实临时文件摘要/模式/清单漂移、链接/硬链接拒绝及扫描间故障，语法和差异检查通过。未读取或导入真实Linux制品、未调用运行时。

## 9. 隔离接入缺口核对与Mac候选（2026-10-11历史提案）

当前决策以9.1及主文档后续章节为准：Docker暂缓，不重复要求选择或安装；下文awaiting_user_confirmation与schema v12均为该时点记录，当前数据库为v13，不是新的操作指令。

隔离面板新增isolation-integration报告及下载，按source/Linux artifacts/staging/control plane/runtime/isolation六段列已实现原语与集成缺口。结果始终blocked_not_integrated，不因固定路径发现可执行文件而开放；schema仍v12，不额外探测或修改系统。

Mac候选建议Docker Desktop（awaiting_user_confirmation），不是已选择、已安装或许可证可用性结论。适用许可、安装、只读发现范围均需用户确认及独立授权；其他平台保持unselected。后续顺序：确认产品和范围→有界只读发现→固定Mac daemon/VM路径与实际版本runner→另行批准Linux制品/staging→哨兵隔离与生命周期验收。Linux系统socket模板不能当Mac配置直接用。

禁止隐式安装、启动VM/daemon、切换context、pull镜像、准备依赖、create/start/stop容器及释放槽。当前内部原语未组成完整可执行链，I2/I3仍部分完成、I4未完成；不能继续把导出规范和模拟数量当实际安全进度。下一项需要用户决定：是否采用Docker Desktop候选，并授权仅只读发现既有安装/上下文信息（不安装、不启动、不连接daemon）；未获授权则只继续不依赖运行时的工程任务。

### 9.1 Mac有界只读发现（2026-10-11已执行）

用户随后明确本机未安装Docker并选择方案一：暂缓真实隔离接入，继续无需运行时的产品工程。不安装Docker，不开启隔离执行；旧可信本机预览仍非沙箱，不作为隔离替代。后续工程顺序转向本地历史检索/分页及可靠性，直到用户另行批准运行时路线。

用户继续后按上一条限定范围执行只读发现，并新增鉴权/显式确认POST `/api/mac-runtime-discovery` 及界面按钮。检查两个固定.app目录、四个CLI候选、最多32个hash命名context meta，单文件读取上限16KiB。只返回固定路径状态及context名/endpoint分类，不输出远端URL/任意名称；不读config.json/TLS/凭据，不执行CLI、不连接daemon或启动VM。

当前实际报告not_found_in_fixed_scope：两个Docker.app路径、四个CLI路径不存在，context metadata目录未发现；不是整机未安装结论，不遍历PATH或其他位置。无法继续实际Docker接入，未安装任何运行时。报告不持久化/不授权，schema仍v12。下一实接前需要用户提供既有安装位置，或单独明确授权安装选定产品并核对许可；一般“继续开发”不视为安装批准。无运行时期间可转其他不依赖运行时的产品工程任务。
