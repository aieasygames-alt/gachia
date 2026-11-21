# R146：五个公开站 Next.js 15.5.29 正式发布完成

Main、原神、异环、蓝色星原、绿梦均已从 Next.js 15.5.28 升级至 **15.5.29**，各一次正式部署、100% 流量。Router 保持版本 `00ab8c66-9387-4b12-9c77-c401c2a21e0c`；四个 staging 的部署/配置保持。OpenNext 1.20.13、Wrangler 4.148.0 和四处 deferred-initial patch 保留。CMS 仍为 R145 的 Next.js 16.4.6，本批没有 CMS 内容、审核、schema 或编辑源同步写入。

实际编译提交 `1c42921d322eab749d6c09bbd06b62c42145656f`；执行提交 `551a3b51b12399d796fa344dc1523c940e9a7eef` 的[完整 CI 44903901582](https://github.com/aieasygames-alt/gachia/actions/runs/44903901582)成功。两者仅报告操作文件不同，五应用、依赖和 Worker 构建输入未变，见 build-reuse.json。官方 Next tarball integrity、四处 patch 原版/修改后 SHA256、冻结安装及运行时门禁均已核验；没有升级其他注册表包。

| 站点 | 正式版本 | 已验收兼容恢复版本 | 候选/恢复云预览检查数 | 公网检查数 |
| --- | --- | --- | ---: | ---: |
| 原神 | `0382cd12-683b-46b0-817d-02bb89f5fd2b` | `77ec8a6f-1b11-4451-9823-8210c3de8470` | 2090/2090 | 1655 |
| 异环 | `b690d5ae-1084-4711-96d9-a313182cb5f7` | `75ff75ca-9dc8-43f9-8d28-94cba3599b01` | 1185/1185 | 749 |
| 蓝色星原 | `78442797-d15e-441e-a00d-2faa6d9aa543` | `a13dcf18-5df9-4eca-9b1f-242eaf2f87af` | 311/311 | 162 |
| 绿梦 | `50812a8a-012f-428e-bb4b-780530181c09` | `b0d551e0-a6cb-4a00-824f-2a5a5618c3cd` | 301/301 | 151 |
| Main | `9843820e-6676-4c02-a393-d814c8bedbc3` | `7ea89ac5-40e9-4bcb-b237-82d0b5929f08` | 2103/2103 | 334 |

兼容恢复保持各站升级前的精确 runtime，并合并新旧静态资源；候选与恢复均完成本机、精确 UUID 云预览和切流前新鲜复验，未执行真实回滚。详细 deployment ID、模块 SHA256、上传身份、控制面前后快照见 completion.json / delivery.json。10 次版本上传、5 次正式部署均保留 intent 与结果，production.jsonl 为固定 15 行。

原神首次切流后的公网验收因错误复用独立 Worker 的 HTML 缓存头停止；既有 Router 实际会将游戏成功 HTML 设为 private/no-cache/no-store。用精确已发布 Router 模块对已捕获的真实 workerd HTML 响应执行投影，逐字节保持正文和指纹，仅得到该模块实际生成的缓存头；1,164 个原神、294 个异环 HTML 的预期因此修正，其他 owner 不变。原始 sealed.json/失败结果保留，新的 sealed-public.json 与 qualification/源码均独立 pin；没有改通用 validator、产品或重新编译。原神 1,655 项公网重新完整验收后，固定接续适配器仅调用其余四站已通过 CI 的部署 writer，未重放原神 POST。核心执行提交仍为 551a3b5，额外操作适配器源码 pin 见 completion.continuation；不能将这些后续操作脚本说成已包含在先前 CI 提交中。

本机独立站 11980 项、聚合 778 项、浏览器 66 场景全部通过；云候选/恢复共 11980 项，切流前同规模复验通过；公网逐 owner 3051 项及最终聚合 778 项通过。验证覆盖页面、JSON、搜索、Main 聚合、客户端导航、桌面/手机和有/无 JavaScript。449 份公开 JSON 的值和字节 SHA256 保持，115 份已发布内容来源全部保持，保留胡桃、异环文本/Zero/27 材料与 441 引用删除状态、攻略增量和 R143 完整原神集合。

本机聚合使用精确已发布 Router 模块在 Node 中，经 HTTP binding bridge 调用五个真实 workerd，不声称 Router 自身运行在 workerd。绿梦仍仅中文；en/ja 两个 Router 原有空 404 的状态、字节与关键响应头已在发布前后独立核验，未套用 owner HTML 404 合同。

最初缺少对应 Chromium、原神旧 QA 未展开标签、Router 非中文绿梦边界与聚合重复覆盖导致 proof 超过 16 MiB，均已修正验收编排并保留失败日志；没有扩大 validator 上限、放宽指纹或修改产品。首次云预检因本批代理白名单拒绝 GitHub API，在任何上传前停止，确认 0 云写后仅让 api.github.com 显式直连；后续 Cloudflare 与站点验收仍经受限代理。网络恢复中误停用户既有代理后已用原程序原配置恢复，配置未改，临时重复进程已停；最终网络路径见 network-used.mjs、preview-preflight-reconciliation.json 和 network-reconciled.json。

绿梦候选 CLI 在已经输出上传 UUID 后退出延迟；对该 UUID 和云模块完成额外只读对账，进程随后自行退出，未重传或强制伪造退出成功。仅对本批 CLI 做过临时本机 Node 句柄诊断，随进程退出关闭；诊断清理请求到达时端口已关闭，保留该 ECONNREFUSED 结果。Main 恢复预览期间按固定 Wrangler 4.148.0 的 refresh_token 协议续期既有 OAuth，账户与 scopes 保持；role 字符串的诊断映射由独立只读账户复核补充，凭据没有进入报告。见 lvmeng-upload-reconciliation.json、oauth-precutover-refresh.json 和 oauth-precutover-authorization.json。

本批修复目标 Next 原有三类公告，目标版本匹配数为 0；全仓仍有 better-auth/adapter、qs、glob、minimatch 公告，含 high/critical，不能称为全仓无漏洞。账号功能保持关闭，详见 security-assessment.json。

唯一正式接续来源：[published-sources/source-index.json](published-sources/source-index.json)，pin `93c6bf6fd6095269414856c575e8012409a10f29a774f06ad8eb1c6ac3af06d3`。真实 readNteSourceIndex 已重开全部云响应/模块与来源，115 来源、allOwnersCurrent=true。CMS 继续使用 [R144 AFTER](../genshin-editing-source-sync-2026-11-21-r144/cms-final.json.gz)，pin `b25b29e1fc523c767252e4059cb9ba8d7574be651b08b783002f9096a9cfaf20`，不重放 R140–R146 的已完成写入/部署。

下一批先将已通过 CI 的 R146 来源读取器安装到常驻 CMS；当前 R145 安装版尚不识别新增来源种类，不能宣称常驻 CMS 已接通该新索引。安装时保持内容/审核/媒体及 R144 编辑源同步状态，无需重发公开内容。随后独立处理剩余依赖公告。见 installed-source-reader-boundary.json 和 delivery.json。

Main 正式部署完成、仅剩只读公网验收时，既有 OAuth 再次按相同协议续期，账户和权限保持，见 oauth-final-refresh.json。完整来源重开通过后，本批临时 CONNECT 转发器已停止，用户既有代理继续运行。最终可用磁盘约 **15.82 GiB**，保持 14 GiB 标准构建预算与 8 GiB 保留线；见 cleanup.json。
