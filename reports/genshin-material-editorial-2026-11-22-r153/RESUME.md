# R153 原神既有材料真实 CMS 发布试点

目标：仅修改 `teachings-of-freedom.sourceEn`：`Domain: Mondstadt (周一/四/日)` → `Domain: Mondstadt (Monday/Thursday/Sunday)`。

接续 R150 source-index pin `4cb01a5f0b7aa2f7ac0519f00bdb217528cfdd8033fa859016582bfdae2fcbb6`；CMS 前态是 R150 cms-after-production pin `7ba95de70d2af86323885e9282879fee2fc6803e1d0e0b27d97c88a866b01114`。

当前仅完成只读 CMS inspect 和开发测试，没有内容写入、Worker 上传或正式部署。原神材料 ID 773，269 个材料中的一条；原 hold/draft 保持直至本批独立审核。所有既有正式增量沿用完整 A。

执行器：`reports/genshin-r153-launch.py`，动作采用独占 intent/result。遇到未知写入结果先读实际状态，不重放。候选/恢复、精确 CI、应用安装验证完成后再执行 activate；最终以 production/completion.json 和 published-sources/source-index.json 为正式结果。

来源初次只读测试因开放 sourceEn 改变历史结构分类而停止，无写入；已限定为维护同步过的 publishedBaseline 后再编辑，需复验历史链。CMS 安装脚本是本批专用副本，不执行旧批脚本的主入口。
