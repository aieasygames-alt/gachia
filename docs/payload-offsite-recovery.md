# Payload 私有异地备份与恢复

更新：2026-11-02（R20补独立key工具/跨机验收清单，实际异地恢复证据仍R17）。CMS/PG仍只在本机运行，公众站点不回源本机；本流程只向专用私有R2写入AES-GCM密文，不上传明文DB、settings、媒体或密钥，不修改任何网站Worker。

## 存储与交付边界

- 专用桶为 `gachia-cms-private-backups`，不复用网站媒体桶，不配置Worker binding、r2.dev公开访问或自定义域名。上传前后均通过API检查公开域名，另以七服务快照核对没有站点接入此桶。
- 对象身份为 `cms/v1/<UTC时间-随机96bit>/<密文SHA256>.gcm`；路径和外部pin必须来自同一交付回执。上传前检查同名对象不存在，并附带If-None-Match；不依赖未验证的远端条件写语义，随机身份加本机排他journal防止本流程重放，不是跨客户端分布式锁。
- `scripts/desktop-offsite-backup.mjs`仅接受私有、无链接、256MiB以内且格式/pin匹配的密文。下载完整验pin和格式后才原子发布新本地文件，拒绝覆盖已有文件。它不接受密钥，也不提供删除或公开访问操作。
- 上传intent先落盘；响应丢失/下载校验/隐私检查失败时保留journal，只读下载对账，不自动再次PUT。下载字节通过不等于AES认证、数据库恢复或应用启动通过，须继续验证。
- 当前冷备包包含DB/私有媒体/settings、当前源码ZIP/锁/测试、已安装manager/publisher与本机导出状态；不含依赖/构建缓存、Wrangler OAuth、Git历史或完整历史release制品/journal。不能凭此包继续历史云上传/推广任务，须重新取证。

## 恢复顺序

1. 从实际R17交付回执取得bucket/objectKey、encryptedSHA256、plaintextSHA256及keyPath。回执见 `reports/payload-offsite-recovery-2026-11-02/encrypted-backup.json`、`offsite-roundtrip.json`；它们不含密钥值。
2. 用已有Cloudflare账号只读下载精确对象；调用 `downloadEncryptedBackup({store,objectKey,pin,destination})`，destination必须为新私有工作目录中的新文件。函数固定使用该账号/桶，不接收任意远程地址。
3. 使用另行保管的32字节密钥和 `desktop-encrypted-backup.mjs` 的 `decryptArchive`，认证解密到新文件并核对plaintextSHA256。格式为ASCII `GACHIA-BACKUP-v1`加NUL、12字节nonce、密文、16字节GCM tag；AAD为magic+nonce，AES-256-GCM。密钥不得与密文一起放进R2，也不要打印到终端、聊天或报告。
4. 先检查tar成员仅为相对普通文件，拒绝链接/穿越/额外成员；按bundle-manifest逐文件核对SHA/大小后才提取到新目录。内含源码ZIP还有独立HANDOFF清单/pin；不要直接解包覆盖运行目录。
5. 先在隔离PG恢复DB、对账逻辑摘要/用户/内容/媒体计数和私有媒体字节，不替换在线DB。安装版 `desktop.py restore-check --backup <本机backups下的新备份目录>`用于同机隔离检查，不是整机恢复命令。
6. 跨机需安装兼容Node/PostgreSQL、按锁重建CMS、重定位settings中的绝对路径/媒体目录、绑定loopback、恢复管理员资格并启动/验证应用；切回本机工作前再校验发布来源与公网当前UUID。不能运行install覆盖现有GachiaCMS，也不能沿用旧acceptedAt继续写云。

## 未关闭的灾备条件

**R2密文副本与独立密钥托管是两件事。** 现有keyPath仍在同一Mac；没有验证独立密码管理器、另一台设备或离线介质里的密钥副本，也不因iCloud目录存在就宣称已同步。整机丢失时仍可能无法解密，因此L03/T11不能整体关闭。

R20检查到当前只有只读应用安装DMG挂载，没有可用独立可写介质或第二台Mac执行上下文，故没有复制真实密钥或宣称跨机启动。默认操作授权不是外部设备已经存在的证据；不将key随意放到iCloud/报告/聊天或密文桶。

### 独立密钥副本工具

接入实际外置介质后，在其上准备本人所有的0700目录，使用源码交付中的工具：

```sh
python3 -B scripts/payload-key-custody.py copy --source "$KEY_PATH" --destination "$EXTERNAL_PRIVATE_KEY_PATH"
python3 -B scripts/payload-key-custody.py verify --source "$KEY_PATH" --destination "$EXTERNAL_PRIVATE_KEY_PATH"
```

拒绝同文件系统目录、链接、公开权限、错误长度和覆盖已有文件；排他写入/刷新磁盘后重新核对32字节，输出不含key值。成功只证明“不同文件系统的字节副本”，**不能证明物理设备独立、已离线/异地保管或跨机应用可启动**。复制后需按实际设备保管方式离线存放，并在独立恢复环境重新取回、解密核验。不要把同一Mac上的新APFS卷当作完整灾备。

### 第二台Mac验收清单

1. 确认这是不同物理主机；取得可信Git提交/源码包pin、R17无密钥交付回执、独立取回的key及Cloudflare只读下载资格。不要拷贝Wrangler OAuth或沿用历史发布intent。
2. 按锁安装兼容Node与PostgreSQL17，在新私有恢复目录校验密文/AES/归档/源码；不能运行install覆盖任何现有GachiaCMS。
3. 按`services/content-cms/deploy/desktop.md`的loopback边界重建CMS；PG恢复到独立实例，settings中的绝对app/媒体/环境路径重定位，PG/CMS只监听127.0.0.1。重建密码/secret来自恢复包，不输出到报告。
4. 验证应用实际启动、管理员可登录、1用户/84内容/1媒体与备份逻辑摘要一致，私有媒体登录后可读/匿名403；验证重启持久性和发布器导入/只读门禁。保存主机身份的脱敏区分、版本、命令退出码及网络/数据证据。
5. 取得新鲜云UUID/资源来源后才准备新发布；新机恢复不允许续跑旧上传/推广journal。原主机和原在线DB在新环境全部验收前保持不变。

实际跨机检查仍未完成。同机新目录、源码单测或本工具隔离测试不能替代这些验收。R18源码Git同步/真实CI子任务已完成；R20更新CI另验，云自动部署保持关闭。尚无自动备份、保留清理或成本监控。
