# R153 原神既有材料真实 CMS 单 Worker 发布完成

2026-11-22：原神正式版本 `0b8a10c8-2fad-4fdf-a8fc-fcab385d6eb6`，100% 流量，deployment `fde1a1e3-fb77-4f7d-b1da-55b2c86ec320`。仅上传两个原神版本、正式部署一次；Main、Router、异环、蓝色星原、绿梦及 staging 保持，所有生产配置保持。兼容恢复 `79194b32-363c-4075-b815-94d371885e29` 已通过本机及云预览、模块身份和资源兼容校验，没有实际回滚。

真实 CMS ID 773，既有材料“自由的教导” `teachings-of-freedom`，仅将 `sourceEn` 的 `Domain: Mondstadt (周一/四/日)` 改为 `Domain: Mondstadt (Monday/Thursday/Sunday)`；星期集合保持，中文及其余字段保持。一次草稿、一次独立审核，真实导入 O 和 R144 受控编辑基线保留。其余 2,965 条 CMS 记录保持。

精确源码 `e7773d1aee9228377e0a370670ca3b5d24797303`，[完整 CI 45034499276](https://github.com/aieasygames-alt/gachia/actions/runs/45034499276) 通过。标准原神构建及 812 项材料检查、候选/恢复各 1788 项直读及 1730 项 Router 读取、两者不可变云预览、正式公网验收与三语×桌面/手机×JS 开关 12 种浏览器场景通过。公开材料 JSON 与英文/日文页面获取说明更新；搜索和 Main 聚合不展示获取说明，既有名称及其他游戏投影保持。

115 份来源仅 `packages/data/games/genshin/raw-materials.json` 变化，269 个材料中其余 268 个逐值保持。胡桃、异环、既有攻略与 R143 完整集合沿用 R150 完整 A。常驻 CMS 已安装精确源码，标准构建、16 组隔离 PostgreSQL/HTTP、冷备实际恢复、新→旧→新切换、数据库/媒体保持和安装版真实读取器重开最终来源通过，115 来源、五 owner、allOwnersCurrent=true。

权威交付：[delivery.json](./delivery.json)。下一批直接接续 [最终来源](./published-sources/source-index.json)，pin `cc71a49160ba622a34eaf5d05bfe21006bfa41a0632f208b57afd36e10376340`；CMS 从 [最终快照](./cms-after-production.json.gz)，pin `25cdf13bc414f8d803e7a36a6a720eb5f1a6f50d8b3b9330df4e899cccbbe732` 接续。不得重放草稿、审核、上传、部署。

操作记录：prepare-01 的 Router 验收曾误含原神内部裸静态别名而返回 404，已限定 Router 检查公开游戏前缀，直读继续检查两个别名。prepare-02 在冻结后因 13.99 GiB 低于 14 GiB 停止；清理可再生成缓存后，prepare-03 从原冻结源码及既有审核接续，未重复内容写入。失败封装/依赖归档已逐文件校验，原构建制品及失败诊断保留。浏览器验收曾因误判并清理现用 revision 1243 缓存而在启动前停止；已用锁定的 Playwright 1.63.0 官方 CLI 恢复缓存，重新完成 12 种场景，依赖和线上版本未变。本批结束可用约 12.21 GiB，下一轮完整游戏构建仍需重新满足 14 GiB 标准/8 GiB 保留线。
