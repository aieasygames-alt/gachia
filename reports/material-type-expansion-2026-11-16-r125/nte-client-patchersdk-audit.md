# 异环 PatcherSDK 协议审计（R125）

生成时间：2026-11-16T05:48:41.946Z

样本：官方客户端 `PatcherSDK_x64.dll`，ZIP SHA-256 `16e8a756000e77ba466d54de75a7f2dfe6856143995381cd18625a1c996ccd98`，解包 DLL SHA-256 `7ff80b450902c29d26d42159fe81782646fe63e65c5fbda402918d4f34577949`。另保存了公开设备列表（82 个条目，SHA-256 `609b60f9549c6b4c920628e15056413d89623da90b9235398919886c69965439`）；该列表是设备/测试门控输入，不是资源或材料清单。

PatcherSDK 的可打印字符串确认它读取 `ResList.zip`、`ResList.bin.zip`、`Diff/Diff.xml`、`gameinfo.xml`、`client.xml`、`config.xml`、`branch_config.xml`，并包含 Pak manifest 与 `.pakpatch` 处理路径；同批 PatcherCheckConfig 已明确校验 `.utoc` 文件。

命中计数：{"ResList.zip":1,"ResList.bin.zip":1,"ResList.bin":2,"Diff/Diff.xml":1,"GlobalDiff.xml":1,"gameinfo.xml":4,"client.xml":3,"branch_config.xml":1,"config.xml":7,"PatcherConfig.json":1,"PatcherPath.json":1,"PatcherSDK/Device/devices.txt":1,"gameResource/Generated/":1,"/version/":1,"Version/":1,".utoc":0,".ucas":0,".pakpatch":1,"PakManifest":11,"files.xml":1}。

这些字符串只能固定协议和资源类别，不能证明 27 个材料的 canonical ID、版本、阶段、数量或 CMS 消费者。材料 source-bound plan 继续保持冻结，`hold=true`。
