# 异环官方客户端清单审计（R125）

- 审计时间：2026-11-16T05:09:13.393Z
- `Version.ini`：1.0.8.1102 / b7e5b78c
- `AllFiles.xml`：https://ntecdn1.perfectworld.com/hd/publish_PC/launcher/1.0.8.1102_4/AllFiles.xml
- 清单文件数：684
- 展开大小：592763492 bytes
- 压缩大小：274814926 bytes
- 更新器 SHA-256：`a3622690a44510ca5c4cf3302878ccd04693c39a8ea7f1ad5a3b5353eb67d917`
- 安装器 SHA-256：`345e84bab04f24b0ec4907e297569586ef155087ecc1732f88757e7eb94a4994`

官方 `AllFiles.xml` 明确列出了 `FileList.dat`、`ResData/3000001.dat`、`ResData/Default.dat` 和四个 `PatcherConfig/*.json` 对象。更新器样本包含 `All_Files`、`ProductVersion`、`BaseUrl`、`File`、`Checksum`、`Path`、`Size` 字符串，并导入 `WINHTTP`，与该清单格式一致。

本次对主 CDN、备用 CDN、清单根路径和版本路径进行了 32 次 `HEAD` 探测，并对两个裸 `FileList.dat` 地址做了 `GET` 复核，状态计数为 `{"403":34}`；裸对象响应正文为 `AccessDenied`。按更新器的 `.zip` 规则读取了 14 个主/备用资源地址，状态计数为 `{"200":14}`，主 CDN 的 7 个压缩对象与 `AllFiles.xml` 的 `ZipChecksum` 完全匹配。另保存了 `PC_150/gameinfo.xml`、`PC_150/Diff/Diff.xml` 和 `Publish_Update/update.json` 的官方响应。

这些压缩对象已经证明 `FileList.dat`、`ResData/3000001.dat`、`ResData/Default.dat` 和 PatcherConfig 内容可以从官方 CDN 读取；其中 `ResData/3000001.dat` 是 Qt resource container，不是直接可读的材料 JSON。当前仍没有从客户端资源中解出材料身份、版本、阶段、数量或 CMS 消费者证据；`AllFiles.xml` 和压缩资源可读性不能替代材料表。

当前结论：继续保持材料门禁 `hold=true`、`publishable=false`、`releaseCompatible=false`。本次没有修改 raw 材料关系，没有生成 source-bound plan，没有执行 CMS 写入、构建、上传或部署。下一步先解码已捕获的 Qt resource container 和客户端资源索引；若本机无法完成，再在隔离 Windows 客户端中固定版本并导出等价的官方材料表。
