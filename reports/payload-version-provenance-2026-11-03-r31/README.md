# R31 精确版本取证与首发推进

日期：2026-11-03。目标是解决C03实际首发阻塞，不扩建CMS，不重复C05a恢复，不要求第二台Mac。

## 已完成的工程与只读验证

- 新上传取证绑定实际Wrangler日志/UUID、出站multipart、封存模块SHA、下载HTTP ETag/字节和前后完整版本元数据。供应商ETag不等于模块SHA；wrong/missing/weak ETag、同UUID配置漂移、额外module均拒绝。
- 候选和兼容恢复的回执pin进入既有journal/preview；推广、续验、人工恢复和来源advance/recover/rebind沿原链传递。四版本检查不再下载会返回latest的历史content，而是重验原始归档及新鲜不可变版本身份/配置。
- 只允许三份已审核原始历史capture；不是以今天的ETag给任意本地代码补造映射。完整原始pin见`desktop-version-provenance.mjs`及取证说明。新上传UUID必须带原始上传回执，未知外部UUID不自动接纳。
- 实际Cloudflare只读验证三份原始runtime、Genshin/NTE双来源选择通过；10Worker/7保护服务及三份附加staging保持不变。首次401按只读流程刷新已有OAuth后成功；无云写入重试。
- 完整发布回归：桌面 **712/712**、其他Node **304/304**、Python **49/49**；CMS **165/165**、typecheck通过。新回归包含latest选择器被忽略、四份回执任一缺失时零推广POST、归档/出站form/日志/回执篡改、owner/role/UUID/release/config互换、续验/恢复/来源完整磁盘链。
- 本机发布器已在维护锁下备份/原子升级并逐文件验hash：25个模块、manager及2份既有TS helper，共28文件。导入/参数拒绝/无网络smoke通过，未重启CMS、未改数据库。

## 验收边界

以上不等于真实新协议候选已上传或公网已更新。真实run、安装摘要、Git/精确提交CI与云网络结果按后续本轮证据更新；R29停止run及R30恢复证据均保持不变。15分钟门禁、显式单批授权、仅game+Main写入及partial后停止/只读对账不变。

本轮开始时唯一真实编辑仍为Genshin既有上手指南的中文标题；83条draft/hold及其他内容不动。C03真实首发/连续/恢复、C04 NTE共享Main、C05b独立密钥仍按实际结果关闭，不能以测试数代替上线。
