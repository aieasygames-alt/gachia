# R30 仅此Mac范围与本机应用恢复

日期：2026-11-03。按用户最新要求，Payload CMS只在这台Mac运行，不再把第二台Mac或跨机安装/启动/迁移列为限定V1完成条件。公众网站继续由Cloudflare多Worker服务，不回源Mac。本轮**关闭C05a本机应用恢复，不宣称C03/C04真实云发布或C05b独立密钥已完成**。当前执行见[有限计划](../../plans/payload-v1-completion-2026-11-03.md)与[任务表](../../plans/project-task-status-current.md)。

## 1. 实际完成，不是又一次旧fixture

- 从最新R29的同一精确私有R2对象重新只读下载51,649,337字节，核对密文pin、AES认证和明文pin；验证36归档成员、2663源码文件、备份数据库/settings/私有媒体。未上传新备份对象，未读取/披露密钥值。
- 在这台Mac新目录建立独立loopback PostgreSQL17实例54330，数据库名仍为`gachia_cms`，恢复完整数据、角色及媒体。恢复后的逻辑摘要与冷备/在线原DB一致，1用户/84内容/1媒体。没有替换在线PG54329或在线数据。
- 保留desktop固定CMS3100 origin和Host/Origin/跨站边界。maintenance锁下短暂停止原CMS，以隔离连接和恢复媒体启动本机已安装Next生产应用；真实管理员登录、84条记录读取、83draft/hold+1published/hold=false、私有媒体授权200/匿名403及字节一致通过，9项安全HTTP通过。
- 应用停止后再次启动、再次管理员登录，内容和私有媒体持久性通过。使用恢复源码中的真实导出函数处理恢复CMS认证读取的published记录，releaseKey为`61cf1ede43df373693eea8cb2b83641ef3791876953ab8024c0233873de0bef6`、候选SHA为`9e49bee84613e11cc261204eb83454ee1848809af094474fd8eccedcc550518b`，均与现有真实候选相同；未调用会写在线发布目录的installed content-export入口。
- 验收结束已停止隔离CMS/PG，原CMS恢复3100健康，原PG仍loaded，在线完整数据库摘要不变。最终只读安全HTTP另9/9，已安装27工具/helper文件与测试源码摘要一致；没有覆盖CMS运行bundle或升级publisher。

复用的是本机已安装应用与依赖；这证明本机数据恢复可用，**不是从源码离线重建、跨机运行或整机灾难恢复**。第一尝试因系统Python的tarfile不支持filter参数在启动PG/CMS前停止；改为验证后逐文件排他提取，独立attempt-02完成。原失败目录/日志保留，不覆写R29证据。

## 2. 精确版本阻塞的有界调查

实际SDK源码表明content.get只有无版本内容GET，versions.get取元数据；Cloudflare文档将版本描述为code/assets/bindings/compatibility的状态快照。R30只新增一次受支持production environment内容GET，没有再穷举历史选择器。返回模块SHA仍为R29最新上传候选`4e9f318a5e2f3da8d6030b4218a4a4973d3905a7a6d51212c25e1cecface3da3`，响应ETag与非活动上传版本的script ETag相同，而不是当前活动旧UUID的script ETag；ETag与模块SHA本身也不相等。

这确认“production路径+HTTP200”同样不能当历史活动代码证据。实际10Worker盘点与R29一致，保护7服务活动部署/运行设置和额外staging均不变；无新候选run/build/upload/promotion/recovery、无正文改动。公众网站仍旧版本，不能称本轮上线完成。

[收敛方案](../../docs/payload-version-provenance-2026-11-03.md)规定下一步改为上传时建立独立字节/UUID/HTTP ETag/元数据回执，后续按不可变版本与可信归档重验，明确区分归档来源和新鲜下载；必须一次覆盖所有准备/推广四版本/续验/恢复/来源接续，旧版本只能从原有独立历史证据显式交接。**本轮只有方案，没有实现/安装该替代协议；现有生产门禁不变，不能据此放行发布。**

## 3. 状态与剩余顺序

| 工作包 | 当前状态 |
| --- | --- |
| C01/C02 | 工程实现/隔离回归/安装已关，真实云恢复后接续仍归C03/C04验收 |
| C03 | 精确历史模块取证仍阻塞；首发、公网验收、连续/partial/恢复接续未关 |
| C04 | 另一游戏Main内容保留修复已在R29安装；实际NTE/共享Main连续性未关 |
| C05a | 最新异地备份的本机应用恢复实际验收完成，不再重复演练 |
| C05b | 独立密钥目的地未配置，key仍同机；不要求第二台Mac运行CMS |

唯一首发工程优先级仍是C03取证实现及真实首发，随后同游戏连续/恢复生命周期与C04。独立key目的地具备时完成C05b，不能把同盘目录/只读DMG或默认授权当设备证据；不增加为首次文字发布前置。不扩大平台、不把准确度、全类型迁移或历史staging重建变成首发门槛。原始P0–P7/T01–T12全范围等级不提升。

## 4. 验证与交付

- 本轮新鲜完整发布回归：桌面680/680、既有Node304/304、Python49/49；新增1项范围回归防止把跨Mac重新加为限定V1条件，且明确独立key/实际云验收仍待办。云控制面单测仍模拟，不计为生产验收。
- CMS165/165、next typegen/typecheck通过；未重跑public应用build/parity、媒体runtime全套或依赖audit。1low依赖风险沿用原限定决定，11月16日前复核，不声称清零。
- 观察10Worker/保护7服务/每次只允许`[game, main]`写入边界不变，本轮云写入0。两个GitHub部署开关只读确认false，main不改；最终精确提交只验证CI及证据索引见本机delivery，不套用旧CI。
- Git只保存本README、安全verification汇总、当前文档和范围回归；原始控制面返回/恢复脚本/日志/数据库/源码ZIP/私有路径/密钥不入Git。R29历史130文件封存及失败发布journal不改，ambient脏checkout不动。
