# 全游戏迁移覆盖基线

源码基线：`98bacec68e86fc21c153b02e75c6353241a6d6b2`。由独立 CMS 的 `pnpm inventory` 生成；`pnpm inventory:check` 检查漂移。

覆盖所有注册游戏/地区 scope；文件清单不是运行数据库状态或已完成字段迁移。公开权威仍为旧来源；已有84条guides导入本机不代表全scope已接管。

| Scope | 游戏 | 数据文件 | 公共镜像 | 独立应用候选文件 | 路由归属 | 状态 |
|---|---|---:|---:|---:|---|---|
| genshin | 原神 | 23 | 8 | 49 | gachia-game-genshin + Main 按路径分工 | 待字段映射/责任人确认 |
| starrail | 崩坏：星穹铁道 | 21 | 8 | 0 | Main | 待字段映射/责任人确认 |
| wuwa | 鸣潮 | 19 | 8 | 0 | Main | 待字段映射/责任人确认 |
| nte | 异环 | 26 | 12 | 58 | gachia-game-nte + Main 按路径分工 | 待字段映射/责任人确认 |
| zzz | 绝区零 | 15 | 6 | 0 | Main | 待字段映射/责任人确认 |
| hi3 | 崩坏3 | 14 | 6 | 0 | Main | 待字段映射/责任人确认 |
| guihuan | 归环 | 15 | 6 | 0 | Main | 待字段映射/责任人确认 |
| ananta | 无限大 | 13 | 5 | 0 | Main | 待字段映射/责任人确认 |
| endfield | 明日方舟：终末地 | 17 | 7 | 0 | Main | 待字段映射/责任人确认 |
| sea | 遗忘之海 | 16 | 6 | 0 | Main | 待字段映射/责任人确认 |
| skjh | 失控进化 | 13 | 4 | 0 | Main | 待字段映射/责任人确认 |
| roco | 洛克王国：世界（国际服） | 14 | 5 | 0 | Main | 待字段映射/责任人确认 |
| roco-cn | 洛克王国：世界 | 15 | 5 | 0 | Main | 待字段映射/责任人确认 |
| aniimo | 伊莫 | 13 | 4 | 0 | Main | 待字段映射/责任人确认 |
| azur-promilia | 蓝色星原：旅谣 | 8 | 0 | 35 | gachia-game-azur-promilia + Main 按路径分工 | 待字段映射/责任人确认 |
| lvmeng | 绿梦：时空之声 | 0 | 0 | 34 | gachia-game-lvmeng + Main 按路径分工 | 待字段映射/责任人确认 |

## 边界与缺口

- 16 个技术 scope 包括 roco/roco-cn 地区差异；对应产品口径约 15 款游戏。地区不是语言。
- NTE 的 items 详情仍归 Main；绿梦独立 owner 只覆盖 zh。共享搜索、导航、图片与 sitemap 不能随整款游戏一起归给单个 Worker。
- 绿梦没有 packages/data/games 目录，内容在独立应用 TypeScript/页面中，不能按 JSON 数量判断迁移完整性。
- JSON 保留 raw 文件类型、源/镜像路径和 SHA-256；独立应用与共享组件为待人工确认的候选，包含渲染代码，不表示全部是内容。
- sharedCandidates 是横跨全部 scope 的公共候选池。外部 R2、非约定目录素材、非注册文件、运行时来源和具体消费者仍待核实；本次没有访问生产存储。
- reviewContract 保存旧审阅门禁引用与 pending/holds；导入时必须保留 evidence/hold 语义，不能以快照中的空列表代替迁移时检查。
- 退出 P0 还需每类内容字段/URL/别名/locale/责任人对账；不能因清单覆盖全游戏就把 P0、P2 标为完成。
