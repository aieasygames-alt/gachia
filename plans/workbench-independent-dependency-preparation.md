# 新基线草案：独立依赖准备方案

日期：2026-10-13。状态：待安装授权；本文是方案，不是执行指令。

## 固定对象

- 代码基线：074b11030c18be82e0ec76af90d2e9db5ffcb55f。
- 草案stage：7de47210-2144-4ab7-940a-2206f8eb3696；workspace：ad38fe4a-a489-44fb-aa64-3e4045b0e378。
- 工作区：.gachia-workbench/agent-stages/7de47210-2144-4ab7-940a-2206f8eb3696/workspaces/ad38fe4a-a489-44fb-aa64-3e4045b0e378。
- 只准备该工作区的依赖，不链接/复制主目录node_modules；旧stage不动，不安装Docker。

## 只读观察

根packageManager锁定pnpm10.10.0，本机版本相同；本机Node25.9.0/darwin-arm64，.nvmrc写20、根engines>=20、admin要求>=22.18。不能把这些声明当平台兼容保证，也不自动切换/下载Node。第一片若获准沿用现有Node，仅准备依赖，不启动Next；Node20已不是完整工具链兼容声明，正式运行版本仍需明确记录。

本次完整锁文件静态解析976个packages条目均有resolution.integrity，无显式resolution.tarball；不代表下载来源可信、零漏洞或已验制品。已有Web闭包975节点/2220边partial_pass，未覆盖其他importer、peer/override完整语义及平台原生字节。pnpm settings有autoInstallPeers=true，不能据此省略冻结锁检查。

未发现已跟踪.npmrc/.pnpmfile或patch配置；此观察不覆盖用户/系统配置。根onlyBuiltDependencies含@swc/core、esbuild、sharp、workerd、@parcel/watcher，表示允许构建不代表本次必须执行。锁没有requiresBuild标记不能证明无安装脚本。Next图片unoptimized，不代表全部原生依赖都可省略。

## 推荐分两次授权

### A：下载/安装布局，不运行安装脚本

获得明确授权后：

1. 重新确认草案审核current、基线/两JSON差异未变，工作区依赖路径无链接指向主目录；记录安装前manifest/锁/配置摘要。
2. 为本次准备在stage下新建专用HOME、pnpm store及缓存；隔离用户配置、移除令牌/代理/registry覆盖，不打印任何凭据。不要用日常HOME/.npmrc，不修改主目录或全局配置。
3. 固定现有pnpm10.10.0、官方npm registry、冻结锁、ignore-scripts；使用只选择@gachia/web及其workspace依赖的filter安装。不得部署、运行migrate、generate、build、dev或postinstall。
4. 使用独立store及copy导入方式避免主目录依赖/全局store硬链接；禁止side-effects缓存。命令所支持配置须先通过现有pnpm帮助核对，不能凭本文伪造参数。
5. 若冻结锁/peer/平台/配置错误、需要下载另一版工具或扩大安装到其他游戏，停止并保留结果，不取消frozen-lockfile、不改锁、不自动扩范围。
6. 安装完成记录实际包布局、符号链接目标、锁完整性检查结果、平台原生包及未执行脚本列表；manifest/锁/JSON未变，Next入口解析在工作区内。SRI/字节/脚本覆盖不足明确未验证，不自动标准备就绪。

此步骤会联网下载第三方包并写独立node_modules/store/缓存，可能占用较多磁盘。ignore-scripts不等于OS沙箱；pnpm本身仍有本机权限，专用HOME也不限制文件/网络权限。安装成功不等于应用可运行。

### B：必要原生脚本与真实Next预览

A完成后审查安装包实际生命周期脚本和缺失原生制品，逐项说明必要性与运行范围。仅获单独授权才执行所需构建脚本；不笼统允许所有postinstall。

真实Next启动仍需明确可信本机非沙箱授权，依赖准备授权不涵盖启动。仅loopback、无真实OAuth/生产凭据，固定草案输入与独立HOME，检查受影响路由/资源/三语搜索加载恢复；应用代码仍可能访问本机文件/网络。生产构建、上传、切流及正式上线不在A/B之内。

## 完成标准

A的交付是可追溯的独立依赖布局及未覆盖项，不是应用验收。B按实际获准范围记录原生制品/脚本与Next真实浏览器结果。失败不删除旧草案、不覆盖历史报告、不自动重试或解锁预览；任何新增Git提交继续另行授权。

## A阶段结果（16.99）

已获用户明确授权并完成。全局入口隔离环境实际10.32.1触发版本门禁；最终使用本机已有10.10.0，不下载工具。仅筛选五workspace、禁脚本冻结锁安装749包；10输入摘要不变。依赖树50627文件约870.5MB表观大小，2678链接均在workspace内、多硬链接0；68个package.json含生命周期字段未执行。平台包存在不代表原生功能通过，SRI未独立逐项重验。结果见independent-dependency-install-result-074b110和independent-dependency-layout-074b110。

B仍未授权。推荐先请求限定非沙箱Next预览，不批量rebuild；如缺原生包/构建脚本先停下逐项说明。生产构建/发布、OAuth和真实凭据均不包含。
