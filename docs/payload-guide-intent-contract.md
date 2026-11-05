# 攻略公开保留、重置与撤回合同

2026-11-05：本片交付**只读审核计划与隔离回归**。没有接入CMS正式导出或生产激活；旧R35前向拒绝门禁不放松。`scripts/desktop-guide-intent.mjs` 的输出固定为 `review_required / productionReady:false / activationSupported:false / cloudWrites:false`，不能作为推广许可。

## 三方字段规则

- O：不可变导入来源；A：已验证版本的当前公开内容；B：新批准编辑导出。三份原始字节摘要必须与调用方固定的expected完全相同，来源变化即拒绝，不自动重新取latest或合并新来源。
- B字段与O完全相同且没有明确意图时，保留A；字段缺失/null/空串不同，不能相互归一化。A中存在而B未列出的CMS新增攻略也保留，不作删除。
- B不同于O且A未独立变更时可生成候选审核计划；A与B都独立偏离O且互不相等时冲突，必须明确 `replace-public` 字段意图，不猜覆盖。
- 刻意恢复到O需要针对稳定ID和六个允许字段之一的 `reset-to-import` 意图，且绑定整份O/A/B摘要。字符串重置可生成审核计划；原overlay不支持的missing/null回写仍拒绝，不能靠新意图绕过字符串限定。
- 固定身份、顺序、媒体、summary、FAQ等旧约束保持。CMS新增后缀按ID排序，已公开新增记录不因hold或删除后台记录而消失。

该纯函数只验证请求内部一致性；不验证角色身份、云UUID或15分钟时效，也不把 `intents` 字段当服务端审批。后续接入必须由服务端reviewer/admin保存不可变批准回执，绑定已验证A的双UUID、来源pin与B摘要，并将其纳入export manifest、plan及推广重验。旧reset拒绝测试在此之前必须继续通过。

## 网站撤回独立于后台状态

CMS draft、hold、unpublish、delete、网站withdrawal是不同状态。禁止从CMS删除记录推导公开页面消失。`planGuideWithdrawal` 只生成以下显式策略的审核清单：

| 策略 | 期望状态 | 路由规则 |
| --- | --- | --- |
| not-found | 404/noindex | 三语言旧URL均无文章canonical/JSON-LD |
| gone | 410/noindex | 三语言旧URL均无文章canonical/JSON-LD |
| redirect | 308 | 只允许指向同游戏另一篇当前公开攻略，按语言对应；禁止自环或外部目标 |

撤回完整发布必须同时处理game列表、精选/相关推荐、搜索、game sitemap、Main公开JSON及canonical/JSON-LD；仍按game+Main顺序发布，不称原子。兼容恢复保留精确公开A和新旧静态并集，旧URL必须能够恢复，不能仅回滚旧UUID。现在没有路由/DTO删除消费者，没有开启网站撤回按钮，也没有撤回任何真实文章。

## 后续退出条件

在正式启用前补齐角色与不可变批准存储、源版本并发检查、导出/manifest绑定、两owner候选和恢复四版本预览、跨表面撤回一致性与真实小批发布。所有未知结果保持journal并只读对账，不自动重试云写入。用户没有批准具体撤回内容与策略时，仅提供计划，不删除文章。
