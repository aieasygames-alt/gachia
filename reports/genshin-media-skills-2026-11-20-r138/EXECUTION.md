# R138：两个角色图片 404 与通用技能聚合修复

日期：2026-11-20。从 R137 交付接续，pin `8cedaab55d01e33d74b75a942ec5de7f637956bfb53e926d190400a9e078a5b0`。本批两项技术问题已处理：正式 CDN 图片已恢复，通用技能支持已开发并验证。

## 图片修复及真实公开验收

修复前，两个规范图片 URL 的 HEAD 均为 404；认证 R2 实读也明确返回 key 不存在。Wrangler 4.148.0 的认证账号和 `gachia-images` custom domain 映射均已核对，`img.gachia.com` 的域名及 SSL 为 active。

素材沿用 R137 已存档的数值角色 API 与图标名绑定：玛拉妮为 10000102 / `UI_AvatarIcon_Mualani`；欧洛伦为 10000105 / `UI_AvatarIcon_Olorun`。从该资料站同名图标端点取得 PNG，保存完整源文件、响应头、URL 和 SHA256，完成目视核对。没有替换成其他角色或生成仿制图。

| 角色 | 正式 URL | WebP 字节数 | SHA256 |
|---|---|---:|---|
| 玛拉妮 | https://img.gachia.com/images/genshin/characters/mualani.webp | 23,674 | `0223fc64236af8efa1d955e9c5728943acde9187110f6e43d7f98d51d49decb1` |
| 欧洛伦 | https://img.gachia.com/images/genshin/characters/ororon.webp | 29,784 | `cb2b871be8fbb26fe2942df72252e182ae0f4b02eccec194b343305b61402e84` |

两张均为 256×256、有透明通道的 WebP。使用项目 Sharp 0.35.5 lossless 转换，可见 RGB 和 alpha 逐像素一致；WebP 编码器会规范化完全透明像素下的不可见 RGB。源文件和输出哈希、数值身份、像素比较均有独立回归。

只在 `gachia-images/images/genshin/characters/` 新增这两个缺失对象，合计 53,458 字节，MIME `image/webp`，缓存一天；未替换任何既有对象，也未清空缓存。写入前意图见 [upload-intent.json](upload-intent.json)，完整公开 HEAD/GET 验收见 [public-acceptance.json](public-acceptance.json)。两者均返回 200；实际 GET 字节的 SHA256 与本地 owner 资源完全一致。

两张资源同时进入 `apps/game-genshin/public/images/genshin/characters/`，供以后 Worker 构建/恢复；没有在 Main 再建图片副本。本批未部署 Worker，CDN 图片上传已经生效，owner 静态文件将随后续应用发布进入该 Worker。来源分类与既有游戏美术资料一致，本批没有对所有权或许可作额外认证。

## 技能支持与候选接续

`GenshinSkillSet` 补齐可选 `passive3` 和 `specialJump`；通用 `Skill.type` 增加 `special`。通用适配器将夜魂天赋保留为 `passive-3 / passive`，特殊跳跃保留为 `special-jump / special`，按主动、特殊动作、固有天赋顺序输出。中英文名称、完整描述和日文界面的既有英文回退均保留，没有将特殊跳跃误归类为被动。

使用 R137 已固定的真实候选，在测试内替换输入，不写 raw 数据。两个通用数据入口和 schema/JSON 序列化均完整输出玛拉妮 7 项、欧洛伦 8 项技能。原有 114 个可展示角色的技能保持；桑多涅按原有 `upcoming` 规则继续过滤，因此 117 条候选定义对应 116 条通用可展示角色。角色详情页面继续显示全部技能。

[candidate-media-patch.json](candidate-media-patch.json)仅将 R137 两条候选角色的空 `image` 改为规范路径，绑定父候选、素材清单、公开验收及新输出摘要。配方、材料及 115 条既有角色定义保持。历史 R137 候选和回执不改写；`hold`、数值/关系/新增实体及恢复资格不因这两项修复而自动放行。

## 验证、边界和下一批

数据包全量 177 项通过；最终通用技能聚焦 4 项通过。媒体/图片工具链 4 项、CMS 聚焦 13 项、原神服务端消费者 5 项通过。Core、Data、CMS、Web 类型检查通过。90 对 raw 镜像、派生清单和 16 scope inventory 校验通过。R138 inventory 只变更两个原神源码摘要、共享技能类型摘要及两张原神资源，其他 scope 保持。

初次测试发现夹具的键插入顺序不等于适配器输出顺序，以及既有 upcoming 过滤规则；已修正测试预期，未放宽产品过滤。测试最初直接导入 CMS 实现，触发 Data 包 rootDir 类型边界；改为读取 R137 已固定的角色资料，未改变包边界。首次图片校验直接比较含透明 RGB 的大 Buffer，差异格式化导致进程退出 137；已改为规范化不可见 RGB 后比较摘要，原失败日志保留。这些失败均未写生产对象；仅最终像素/身份校验通过后才上传。

真实云写入仅为两个 R2 图片对象；没有真实 CMS/raw 写入、Worker 版本上传/部署、远端 CI、完整应用构建或 R134 来源推进。技能代码尚未部署，随下一次合格的原神 Worker 发布上线。完整构建 14 GiB 预算与 8 GiB 保留线不变。

实现、资源与回归已保存为本地提交 `ccfc187`；交付文件固定其输入、候选和测试日志摘要，未推送远端。

下一批直接从 [delivery.json](delivery.json)接续：使用 R137 完整候选和本批两条图片补丁，对账 CMS import O / R134 发布 A / 候选，再做有界导入和数值、关系、新增实体的审核/发布/恢复合同。保留既有 10 处本地与发布来源差异及胡桃、异环、攻略增量。无需重新取证 49 项特产、重做配方比较或重复图片上传；绿梦仍保持中文范围。
