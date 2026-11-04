# Payload 私有异地备份与恢复

**2026-11-04最新范围决定：** 用户暂不需要独立密钥存放位置，C05b改为未完成/明确暂缓，移出当前限定V1上线条件，后续恢复韧性工作另排；不再要求现在接入独立介质。保留本机现有key、备份与私有R2密文，不关闭备份、不将密钥随意外传。若Mac与同机key一并丢失，R2密文可能无法解密，因此不声称完整整机灾难恢复，T11/P7完整范围仍未关闭。详见[当前内容工作流与范围决定](payload-agent-publishing-workflow.md)。以下历史验收和工具保持可用，不将暂缓冒称已通过。

更新：2026-11-04 R36（双游戏实际发布/双向Main交接通过，修订后的限定V1运行里程碑完成；C05b仍暂缓）。用户明确CMS只在这台Mac运行，**不要求第二台Mac或跨机安装/启动验收**。公众站点不回源本机；本备份流程只向专用私有R2写入AES-GCM密文，不上传明文DB、settings、媒体或密钥，不修改任何网站Worker。**最新已验异地对象仍为R29**，含1条published编辑与当时的发布器；该编辑已于R32公网生效。R36两次新编辑与最新发布器尚未写新R2对象，不把本轮冷备或限定V1完成冒称最新异地恢复达标。恢复见[R30](../reports/payload-single-host-closeout-2026-11-03-r30/README.md)，异地对象见[R29](../reports/payload-real-lifecycle-2026-11-03-r29/README.md)，本轮发布/本机备份见[R36](../reports/payload-agent-live-publish-2026-11-04-r36/README.md)，安装应用见[R33](../reports/payload-editorial-lifecycle-2026-11-04-r33/README.md)。

R36三次本机冷备分别在NTE编辑前、Genshin编辑前及两次发布/交接后；最终目录为`~/Library/Application Support/GachiaCMS/backups/20261104T152116Z-424b09`，含当前84记录/2eligible、私有媒体/settings。备份后CMS/PG健康、9项安全HTTP和698应用/28工具摘要通过。未对本轮备份重复恢复演练，最新异地包与安全保留治理是独立运维余项，不重开已验C05a，也不取消本机备份。

## 存储与交付边界

- 专用桶为 `gachia-cms-private-backups`，不复用网站媒体桶，不配置Worker binding、r2.dev公开访问或自定义域名。上传前后均通过API检查公开域名，另以七服务快照核对没有站点接入此桶。
- 对象身份为 `cms/v1/<UTC时间-随机96bit>/<密文SHA256>.gcm`；路径和外部pin必须来自同一交付回执。上传前检查同名对象不存在，并附带If-None-Match；不依赖未验证的远端条件写语义，随机身份加本机排他journal防止本流程重放，不是跨客户端分布式锁。
- `scripts/desktop-offsite-backup.mjs`仅接受私有、无链接、256MiB以内且格式/pin匹配的密文。下载完整验pin和格式后才原子发布新本地文件，拒绝覆盖已有文件。它不接受密钥，也不提供删除或公开访问操作。
- 上传intent先落盘；响应丢失/下载校验/隐私检查失败时保留journal，只读下载对账，不自动再次PUT。下载字节通过不等于AES认证、数据库恢复或应用启动通过，须继续验证。
- 当前冷备包包含DB/私有媒体/settings、当前源码ZIP/锁/测试、已安装manager/publisher与本机导出状态；不含依赖/构建缓存、Wrangler OAuth、Git历史或完整历史release制品/journal。不能凭此包继续历史云上传/推广任务，须重新取证。

## 恢复顺序

1. 从同一轮实际交付回执取得bucket/objectKey、encryptedSHA256、plaintextSHA256及keyPath。最新已验异地对象来自R29，回执在`reports/payload-real-lifecycle-2026-11-03-r29/encrypted-backup.json`、`offsite-roundtrip.json`；旧R17回执仍保留，不混用两轮密钥/对象/pin。回执不含密钥值，原始回执仅本机保留，不跟随Git提交。本轮更新的本机冷备不是该R2对象，不混用其明文pin。
2. 用已有Cloudflare账号只读下载精确对象；调用 `downloadEncryptedBackup({store,objectKey,pin,destination})`，destination必须为新私有工作目录中的新文件。函数固定使用该账号/桶，不接收任意远程地址。
3. 使用另行保管的32字节密钥和 `desktop-encrypted-backup.mjs` 的 `decryptArchive`，认证解密到新文件并核对plaintextSHA256。格式为ASCII `GACHIA-BACKUP-v1`加NUL、12字节nonce、密文、16字节GCM tag；AAD为magic+nonce，AES-256-GCM。密钥不得与密文一起放进R2，也不要打印到终端、聊天或报告。
4. 先检查tar成员仅为相对普通文件，拒绝链接/穿越/额外成员；按bundle-manifest逐文件核对SHA/大小后才提取到新目录。内含源码ZIP还有独立HANDOFF清单/pin；不要直接解包覆盖运行目录。
5. 先在隔离PG恢复DB、对账逻辑摘要/用户/内容/媒体计数和私有媒体字节，不替换在线DB。安装版 `desktop.py restore-check --backup <本机backups下的新备份目录>`用于同机隔离数据库/媒体检查，不会启动应用，也不是整机恢复命令。
6. 需要验证应用时，使用同一Mac上的独立PG实例/端口，数据库名仍为`gachia_cms`，备份settings中的数据库连接端口和媒体路径仅在隔离进程环境中重定位，不覆盖安装settings。保持CMS固定loopback3100及请求边界，不为演练放宽desktop模式。持有maintenance锁，短暂停止原CMS，再用已安装应用启动恢复数据，验收结束无论成功或失败都停止隔离进程、恢复原CMS、关闭隔离PG，并核对原DB摘要。不能运行install覆盖现有GachiaCMS或沿用历史acceptedAt继续写云。

## 本机应用恢复验收（C05a已通过）

R30对同一R29对象重新只读下载51,649,337字节，校验密文SHA、AES认证与明文SHA；逐个验证36归档成员、2663源码文件、备份DB/settings及媒体字节。不是复用旧解密结果冒充新下载。独立PG只监听`127.0.0.1:54330`；原PG54329和在线数据库保持原样。

恢复DB完整逻辑摘要与冷备相同，1用户/84内容/1媒体；使用已安装Next生产应用真实启动3100、原管理员登录，读取84条记录（83draft/hold、1published/hold=false），私有媒体匿名403/授权200且字节相符，9项安全HTTP通过。应用重启后再登录、内容与媒体仍一致。使用恢复源码中的真实导出函数处理恢复CMS认证读取的published记录，生成的releaseKey和候选SHA均与R29真实候选相同；未运行会写在线导出状态的installed content-export命令。

验收后原CMS/PG均loaded且healthy，原数据库完整摘要不变，隔离PG和CMS已停止。复用本机已安装应用及依赖，**不声称从零重建应用、跨机启动或整机损坏后可恢复**。首次尝试因系统Python不支持tar的filter参数在启动PG/CMS前停止；修正为验证后逐文件排他提取，新attempt独立完成，失败证据保留。

## 未关闭的灾备条件

**R2密文副本与独立密钥托管是两件事。** 现有keyPath仍在同一Mac；没有验证独立密码管理器、另一台设备或离线介质里的密钥副本，也不因iCloud目录存在就宣称已同步。整机丢失时仍可能无法解密，因此L03/T11不能整体关闭。

历史R29对挂载设备的观察不等于用户没有其他设备，也不要求用户再准备第二台Mac。最新R29与历史R17密钥仍只在同一Mac，默认操作授权不是独立目的地已经存在的证据；不将key随意放到iCloud/报告/聊天或密文桶。独立目的地只需安全保管密钥，不需要运行CMS。C05a本机恢复已关，C05b独立key托管仍待办；后者不增加为首次文字发布前置，但不能据此宣称完整灾备完成。

### 独立密钥副本工具

接入实际外置介质后，在其上准备本人所有的0700目录，使用源码交付中的工具：

```sh
python3 -B scripts/payload-key-custody.py copy --source "$KEY_PATH" --destination "$EXTERNAL_PRIVATE_KEY_PATH"
python3 -B scripts/payload-key-custody.py verify --source "$KEY_PATH" --destination "$EXTERNAL_PRIVATE_KEY_PATH"
```

拒绝同文件系统目录、链接、公开权限、错误长度和覆盖已有文件；排他写入/刷新磁盘后重新核对32字节，输出不含key值。成功只证明“不同文件系统的字节副本”，**不能证明物理设备独立或已离线/异地保管**。复制后需按实际设备保管方式离线存放，再独立取回并在本机新目录认证解密验证。不要求在其他Mac运行CMS，不把同一Mac上的新APFS卷当作完整灾备。

### 独立密钥托管剩余验收（C05b）

1. 配置真实独立、安全、可写的目的地，确认物理独立与保管方式；不能把只读DMG、同盘目录或授权文字当作介质。
2. 用现有工具排他复制/刷新/核对key，保存不含key值的回执；密钥与R2密文不共存储，不经聊天传递。
3. 从该目的地独立取回key，在这台Mac的新私有目录对同一轮精确对象完成密文pin/AES认证/明文pin验证。该项仅证明密钥可取回，不假称整机灾难恢复。
4. 恢复任何本机数据后，仍须新鲜核对当前云UUID与可信来源，再建新发布run；不能续跑旧上传/推广journal。

尚无自动备份、保留清理或成本监控；它们不是要求CMS在其他Mac运行的理由，也不新增为首次文字发布前置。
