# 异环资源清单端点探测（R125）

生成时间：2026-11-16T05:52:10.595Z；使用 42 个有界 HEAD 请求。

状态计数：`{"200":8,"403":34}`。

公开可读端点：`https://ntecdn1.perfectworld.com/clientRes/PC_150/gameinfo.xml`、`https://ntecdn1.perfectworld.com/clientRes/PC_150/Diff/Diff.xml`、`https://ntecdn1.perfectworld.com/clientRes/Publish_Update/update.json`、`https://ntecdn1.perfectworld.com/clientRes/PatcherSDK/Device/devices.txt`、`https://ntecdn2.perfectworld.com/clientRes/PC_150/gameinfo.xml`、`https://ntecdn2.perfectworld.com/clientRes/PC_150/Diff/Diff.xml`、`https://ntecdn2.perfectworld.com/clientRes/Publish_Update/update.json`、`https://ntecdn2.perfectworld.com/clientRes/PatcherSDK/Device/devices.txt`。

本轮没有下载任何 ResList、client manifest 或 Pak/UCAS/UTOC 大文件。候选资源清单路径仍返回 403 或不可用，因此不能从 URL、哈希或协议字符串推断材料表。

结论：`readableResListFound=false`、`readableClientManifestFound=false`（已知的 gameinfo、Diff、update 和设备列表端点除外），`hold=true`。
