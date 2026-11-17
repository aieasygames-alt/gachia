# R127 异环正式单 Worker 更新：审计修复与交付

本批已完成。当前执行入口：`qualification-02/`。Main 一次性内容恢复及来源推进已完成；异环文本于 2026-11-17 19:03:20（北京时间）正式验收通过，19:10:17 完成独立来源推进与标准读取器完整重读。最终机器回执见 [delivery.json](delivery.json)。所有历史回执、journal、部署 ID 和旧轮次证据保持原字节。

## 已落实的审计修复

- 执行器读取原始 Git 对象，拒绝 replacement、graft、未知 preload 和 Git 对象/工作树环境覆盖。标准 tsx CLI 的固定 file URL 加载器有明确兼容与正反回归。
- 缺失的 R119 正式 bundle 没有伪造恢复。使用提交内固定清单建立显式只读来源检查点，记录 `historyComplete:false`，重新核对 115 来源、五 owner 的完整模块/资产和 Router，以及当前控制面快照。
- CMS 继续使用真实安装 `98affe759dae271053a5c13617193abede14cae6`，验证它是执行提交的祖先，不制造“CI 对齐安装”。本批复用已批准的记录 1328（咲里 `sakiri`），未再次修改草稿。
- 公网预检移到首次上传前。固定并发 8、单请求 30 秒、批次 8 分钟、零重试；阶段进度写入 `progress.json` 并输出。
- 查明 R123 Main 构建真实回退了 Ananta 安装攻略和 HI3 版本攻略的既有增量。一次性恢复 Main 后再建立新来源，不以替换旧期望哈希掩盖差异。

## 精确提交与验证

执行提交：`f85accac7eeb37cffcec12c0bc7b91f5e5d70431`。

完整 CI：[44059796226](https://github.com/aieasygames-alt/gachia/actions/runs/44059796226)，全部步骤成功，无跳过。原 `5930910` 的 CI 失败记录保留，失败原因是标准 tsx CLI 的 file URL 加载器被误拒绝；该失败提交的准备结果没有使用新 CI 冒充通过。

新来源检查点 pin：`ba24a1b4dab6d55de2ca06f08e12fcfb6b2b0cd3ce7a4de16faf31a19bec25f8`。

新 Main 本地 bundle pin：`d4b09db10b0d3a1dafab06d8277afeff31cc911cecf2a0424a775a64545c45ac`。

Main 候选和恢复版各通过 1,258 项直接响应、353 项聚合响应。本地 JSON 差异精确限定为 `/data/ananta/raw-guides.json` 和 `/data/hi3/raw-guides.json`，分别恢复 `download-install-guide` 和 `v9-0-official-update-guide` 的保留增量；其余 JSON 保持。恢复前的 353 项公网基线已通过。见 `qualification-02/main-local-content-delta.json`、`executor-ci-run.json`、`public-baseline-before-main/result.json`。

首次 Main 激活在云写入之前被历史 Wrangler 绝对路径检查拦住；该次没有创建生产执行目录或上传。复用历史记录所指向的同版本、同锁文件、同 launcher/CLI SHA256 的依赖路径后再次预检，未修改执行源码或历史回执。

## Main 一次性恢复结果

2026-11-17 18:31:35（北京时间）完成正式验收。兼容恢复版本 `992c7985-4d76-4f98-92e3-478a90cecb5a` 和候选版本 `a487451e-d54c-454f-8acc-9f7a0e30a73a` 各通过 1,258 项精确云预览；两批分别约 160 秒和 157 秒，资格窗口没有放宽。候选 deployment 为 `82ed626a-1006-4c18-aff3-d39b82be9964`。恢复前预检、推广后 353 项公网验收通过，仅 Main 正式部署变化。完成回执 `qualification-02/main-restoration-production-01/completion.json` 的 pin 为 `90979e71a52a1bf9698e7031dc1a83d5d37f8cbb4d7907a3af7907612188679c`。

独立来源推进已完成：`qualification-02/main-restored-sources-01/source-index.json`，pin 为 `25eaa7bc0d9230714a42766d527dd4b0fba8266fc0644fffb7badfd8acec39d5`。重新核对所有 owner 模块、控制面、353 项公网及新来源读取通过，保留 `historyComplete:false`。

## NTE 本批准备与预检

本地 bundle pin 为 `1ec441f1d16ea6d4bb10688310941955d632809918e1a70a89c1fc9b3fe8384e`。候选和恢复版各有 843 项直接响应、350 项聚合响应。115 份来源中只有 `packages/data/games/nte/raw-characters.json` 改变，深度比较确认语义差异仅为 `sakiri.description` 的乱码修正，其余 114 份来源哈希完全一致；见 `qualification-02/nte-local-content-delta.json`。候选内容版本为 `7cc0d0c6b1ed4c9df46c36a1e13374b6cfd331f065a03e7e9c335146ba20a864`，搜索投影和 Main 平台聚合沿用原字段范围并切到同一内容版本。

首次正式 NTE 预检在读取祖先 CI `42996396579` 时遇到连接超时，发生在生产执行目录建立及首次上传之前。独立诊断在原生请求、加载固定 Wrangler 后、读取其配置后三次均返回 200；随后按正式 CI 校验函数重验全部十个祖先成功，诊断结果为 `qualification-02/ci-connectivity-03.json`。没有修改连接器、扩大超时或全局网络补丁。重跑完整正式预检，350 项当前公网基线已通过。

## NTE 正式发布结果

兼容恢复版本 `1e8ac596-0b3a-4a0b-bf2a-61a4f0df1059` 和候选版本 `6f509611-e4ef-4b6d-b41b-2768721ade2c` 各通过 843 项精确云预览，分别约 100 秒和 106 秒。资格窗口、并发、超时与重试策略保持标准值。2026-11-17 19:01:14（北京时间）正式部署候选版本，deployment 为 `4e5252be-20f0-4164-8861-235edfdf37c1`；19:03:20 完成 350 项公网验收与最后复核。正式完成 proof 为 `qualification-02/nte-production-01/completion.json`，pin 为 `c9bbbe356506d789a6c101a11c6ecad2792151ccba54523bf7d88bf251862498`。

公网 `/zh/nte/characters/sakiri` 与 `/data/nte/raw-characters.json` 均包含批准后的“桐丸”简介；三语言 `/data-manifest/search-{zh,en,ja}.json` 与 `/data-client/nte-platform.json` 的异环内容版本均为 `7cc0d0c6b1ed4c9df46c36a1e13374b6cfd331f065a03e7e9c335146ba20a864`。搜索与平台摘要沿用原投影字段，未声称它们展示简介。可读核对见 `qualification-02/public-delivery-summary.json`，原始 350 项响应及正文保留于 `qualification-02/nte-production-01/public-0-router/`。

正式来源推进已独立重验 completion、原始来源与祖先 CI、五 owner 模块和 Router、前后部署快照，以及另一轮 350 项当前公网响应。标准读取器随后完整重读成功，程序 exit 0。新来源为 `qualification-02/nte-published-sources-01/source-index.json`，pin 为 `60d832f0b70fdf92159ffc7728295bf9ce0694e1b90204e286617363f8e96eb8`；包装 proof 见 `qualification-02/nte-source-result.json`。正式 completion 中的 `sourceAdvanced:false` 保持原字节，后续完成事实由独立来源回执证明。

115 份新来源逐份核验文本 SHA256，只有 `packages/data/games/nte/raw-characters.json` 改变，其余 114 份保持，包括胡桃、既有攻略、R122 蓝色星原和 R124 绿梦的内联增量。七个受控服务（Main、staging、Router 和四个独立游戏）前后完整部署记录对比仅 `gachia-game-nte` 变化，所有服务设置相同；未声称新快照覆盖账户中的其他 Worker。Main 的一次性恢复在前一步独立记录，NTE 发布的起点准确接续其恢复后快照。

## 存储处理

本轮只清理可重建缓存、复用固定第三方依赖，并对本轮不活动的本地准备文件做相同字节/模式的存储去重；所有来源、资产、模块、证据路径和 pin 保持。每次操作后完整重读两轮 Main 来源和 bundle。激活前实测可用 14.46 GiB，全部发布及来源推进后可用约 14.26 GiB，仍满足标准 14 GiB 构建预算，8 GiB 保留线保持。详细意图与结果位于 `qualification-02/*dedup*.json`，最后测量见 `qualification-02/final-storage.json`。

## 审计问题的关闭方式

前批审计见 [R127 循环审计](../nte-r127-loop-audit-2026-11-17/EXECUTION.md)。F01/F04/F06 通过原始 Git 对象保护、显式历史缺口和新来源检查点修复；未宣称找回缺失的旧 bundle。F02/F03 通过保留原事件、另建当前观测和验证真实 CMS 安装修复。F05/F11 改回标准 prepare → audit → activate → advance 合同与末尾复核。F07 用首次云写入前的真实公网预检发现并单独恢复 Main 丢失的攻略增量。F08/F09/F10 使用提交内固定的网络预算和预览阶段进度，本轮两份 NTE 云预览总计约 205 秒，未扩展资格窗口或注入网络补丁。F12 通过最终完成回执和两个当前队列表的 R127 状态块固定下一来源。

第 09 次自定义准备、改写历史副本和伪造 CMS 对齐副本仅保留取证，未用于此次准备、推广或来源推进。耗时来源重读期间按阶段文件、日志和进程活动判断进展，没有重新启动已上传或已部署的操作。

## 交付边界

27 个缺失材料继续 held，`zero` 角色关系仍未批准，不作为此次既有角色文本更新的前置条件。恢复版本已通过云预览，本批没有执行生产回滚演练。此次资格限定既有角色文本；不外推所有字段、全内容类型、媒体替换或新增/撤回。来源链继续如实保留 `historyComplete:false` 的历史缺口事实。

本批正式 completion、完整公网验收和来源推进均已完成。下一批直接使用上述新来源 proof，按内容类型扩展；缺失材料独立来源审查，蓝色星原和绿梦已完成的正式发布不重跑。维护树已快进合并精确执行提交，原有 11 个未提交文件内容在合并后逐字节核对保持；已有材料审计改动不混入本轮交付提交。

最终队列与回执更新后，既有 runbook、release scope 和 CI scope 共 45 项文档/范围检查通过，无失败或跳过，`git diff --check` 通过。此后的提交仅记录交付事实；正式执行资格仍引用 `f85acca` 的完整精确 CI。
