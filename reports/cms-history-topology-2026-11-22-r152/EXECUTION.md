# R152 常驻 CMS 历史工具与绿梦拓扑校验补丁完成

已安装精确源码 `371775298ef3ae9b439bb45a7db30078041ef53f`，完整 CI [45024526539](https://github.com/aieasygames-alt/gachia/actions/runs/45024526539)通过。安装位于 `/Users/robert/Library/Application Support/GachiaCMS/releases/20261122T130956Z-cms-history-topology-r152-37177529/services/content-cms`，Next 16.4.6 / Payload 3.92.1 / React 19.2.6和依赖锁保持。

最终采用 attempt-02 重新构建和封存，首份 b172058 准备包未安装。共用预览地址白名单补齐 Azur/Lvmeng，仍拒绝未知服务、staging与非法UUID。

历史 transport 验证从已封存工具回执定位原工作目录，继续检查原锁与冻结来源一致、工具路径解析一致及工具摘要。真实早期原始发布和远端祖先CI已重新校验通过；R127明确重建checkpoint仍如实保留缺失R119 bundle的历史边界，不宣称原始历史已全部恢复。

绿梦的新发布必须使用完整当前来源，Main、蓝色星原及其余保护服务的任何未登记部署变化均拒绝；取消旧实现将实时版本填入例外的行为。安装版已核验准确基线通过、Main/Azur漂移拒绝。绿梦继续中文范围，本批没有绿梦内容修改或Worker发布。

原神passive3/specialJump文本支持沿用R151。玛拉妮passive3、欧洛伦passive3/specialJump的12个既有文本字段、三项候选及精确恢复仍通过，未修改原神CMS文本或发布原神Worker。

标准构建、15组隔离PostgreSQL/HTTP、常驻HTTP、冷备实际恢复和新→旧R151→新应用切换通过。准备后与安装后真实读取R150最终来源均为115来源、五owner、allOwnersCurrent=true。2,966条draft/published、43表/序列和媒体、六生产/四staging部署及配置保持。安装阶段0内容/审核写入、0 schema迁移、0 Worker上传或正式部署。

见 [delivery.json](./delivery.json)。正式来源继续 [R150 source-index.json](../azur-repeat-editorial-2026-11-22-r150/published-sources/source-index.json)，pin `4cb01a5f0b7aa2f7ac0519f00bdb217528cfdd8033fa859016582bfdae2fcbb6`；CMS继续R150最终快照，R152只读快照内容与其一致。当前可用约 16.3 GiB；下一次完整游戏构建仍检查14 GiB标准门槛及8 GiB保留线。
