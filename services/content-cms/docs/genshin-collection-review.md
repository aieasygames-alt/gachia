# 原神完整集合独立审核与导出

合同 `genshin-collection-review-v1` 从 R141 写后输入和已安装的结构批次接续。它不重放 42 条材料草稿或 179 条结构暂存，不放宽通用内容编辑器。现有不可变 `migration-records` / `migration-batches` 存放独立的 221 条审核比较和完整 manifest；新增 `genshin-review-decisions` 仅存放审核决定，加法迁移保留旧审核及版本历史。

每条比较包括真实 import O、发布 A、CMS 当前值、候选、三方合并结果、完整数组差异、变更类别、身份迁移和证据 pin。42 条已保存的草稿也必须独立审核。`runKey` 覆盖完整输入摘要、179 条结构批次、全部 390 条当前 CMS 记录摘要、115 份 A 来源 pin 和 221 条 revision。任何 CMS 前态变化均使这轮审核失效；未在提案中的 CMS 草稿不能混入导出。

在 CMS 管理页的 Migration records 中按 `family=collection-review/...` 查看比较，在 Content review / Genshin review decisions 创建决定。选择该条比较、完整 `runKey`、`accept-export` 或 `reject`，并填写 10–2000 字符理由。只有 admin/reviewer 可以创建，编辑、删除和第二次决定均禁止。服务端重建绑定、检查完整批次和显示投影，填写真实 actor 和 revision；客户端提供的这些字段不受信任。拒绝会阻止这次完整集合导出，重新提案需要新输入及新审核。

`accept-export` 只准许生成独立候选，不清除内容 hold、不替换编辑源、不发布 Worker。数值/分类、受保护来源、配方关系、两项身份迁移和新增实体只能使用这个有界合同；旧 `legacy-records-v2` 与普通文本发布器不能消费它。

安装应用 CLI `scripts/genshin-collection-review.ts` 支持 `stage`、`decide`、`verify`、`export`。四个操作均要求精确安装 manifest、源码提交、仓库路径、有 pin 的输入及全新回执路径；`decide` 还要求完整逐项决定包 pin 和现有审核员 ID。CLI 在开数据库前检查当前已安装应用全部源文件与构建身份，必须通过桌面维护锁运行。重复 stage 只读复用；重复 decide 必须与既有决定、理由及审核员完全一致，不重复写入。决定包在一个真实事务中落库，失败全部回滚。

导出重新验证已安装结构批次、完整审核比较、全部 221 条同版本接受决定和当前 CMS。输出完整 115 份来源、其中 3 份原神覆盖源及发布 A 的恢复源，保留真实 O；没有合成 O=A 基线。完整候选应包含 269 材料、117 角色和 90 关系，5,490 次材料引用全部闭合。其余 112 来源逐字节保留，含胡桃已发布文字、异环清理及攻略增量。

恢复使用准确的发布 A，允许 A 本来存在的材料缺口，不重新引入候选实体或关系。后续构建要将新旧静态资源作兼容并集，分别验证候选和恢复的页面、JSON、搜索与主站聚合。导出 manifest 明确 `productionReady=false`、`activationSupported=false`；真实构建/消费者/兼容恢复验收及正式发布继续是独立门禁。

49 个特产的 rank=1 是社区资料 API 展示稀有度，固定游戏表缺少 rankLevel；本合同不将其改称官方一星认证。两条角色关系迁移保留 sara→kujou-sara、shinobu→kuki-shinobu 的数值 ID 与证据。恢复应用时保留加法 schema；若已有审核决定，迁移 down 拒绝删除审核历史。
