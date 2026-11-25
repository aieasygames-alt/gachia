# 当前光锥与4.7位面饰品（2026-11-25）

本批接续阿哈独立角色页，新增3个由Payload独立维护的图鉴条目：`/zh/starrail/weapons/when-the-first-aha-rang-out`、`/zh/starrail/artifacts/gods-momentary-bliss`、`/zh/starrail/artifacts/subspace-sanctuary`。

## 资料口径

两套饰品的两件套效果与门槛在Star Rail Station及BWIKI一致。光锥叠影1—5、80级整数面板及六次晋阶消耗据BWIKI详情页整理，目前只有一个可读数值源，前台明确披露未完成第二来源交叉核验。官方专题仅核对光锥名称/命途/窗口及饰品新增/差分宇宙获取，不把第三方数值标为官方确认。原始HTML存于忽略目录`.private/`，摘要见`source-comparison.json`。不采用竞品图片、故事或攻略正文。

光锥基础速度为12/14/16/18/20点，笑点为10/12/14/16/18，无视防御为16/18/20/22/24%；保留战技目标、每间隔1回合最多触发1次、本场战斗及不可叠加限制。六次晋阶合计385,000信用点，不含升级经验与喂经验信用点。

神的瞬息欢愉：速度6%，欢愉度≥40%时入战行动提前40%。亚空异容所：速度6%，速度≥145时入战后全队击破特攻18%，无法叠加。未核验具体差分宇宙关卡标题、掉落、配装收益。

## 独立更新链路

新增`equipment`类型，沿用Payload既有事实数组，每个事实首行为小节标题，后续行为正文。标题、摘要、效果、数量、来源与边界均由CMS发布记录驱动，不另存一份静态数值。读端为上述稳定详情地址及光锥/遗器目录。路由归属白名单防止未知条目误接入；撤回后隐藏目录入口、详情显示待发布并noindex，不回退旧库；英日文保持独立发布。

类型选择仍存既有SQLite文本列，本批没有新增字段或数据库迁移。实际编辑器同步经基线比对的配置/解析器/路由注册表，重新生成类型、构建并重启。全部内容写入使用Payload Local API和版本历史，未直接编辑SQLite内容；数据库一致性备份存于`.private/`。

## 验收与发布

源码提交`7c6e34f80ed21424b8bfabfd525b3567def335ec`，CI [45576354606](https://github.com/aieasygames-alt/gachia/actions/runs/45576354606)通过。主站105文件622项、数据18文件181项及CMS8项测试通过，各自类型检查、主站OpenNext/CMS生产构建、镜像与清单检查通过。构建仅保留既有auth-dialog hooks警告。摘要见`checks.json`。

Main由`c4506b7a-d6c6-400b-9dd8-f2b2e2eff8a0`切换为`d26fb0dc-4e5b-47e1-8971-fe26b4a26c79`。上传并下载验证模块SHA256 `68c2333353f7f754631bb4172268bbc0ede4227efc0133bc299d706dea9d3bce`。保留前版全部1499个静态资源路径，复制1374个，所有碰撞内容一致。候选与正式各通过66项路由检查、32个静态资源逐字节摘要比对。独立七服务前/后快照确认其余六个服务部署未变，全部七服务routes/subdomain/bindings/settings未变。发布后只读快照曾遇OAuth401，通过项目Wrangler刷新后重读成功，没有重做部署。

3条草稿先验证公开导出仍为20条。兼容Main上线并读回原20条未变后，通过Payload Local API正式发布，检查版本历史，再执行既有`publish:starrail`；回执`ok:true`、count23、revision `1795595746818`。主站23条完整规范记录与审定批次精确一致，其他语言各0条。新增详情/目录、原有5攻略、阿哈角色/计算器、首页/跃迁/活动及三语隔离、no-store、缺译noindex均通过。真实本地Worker验证权限、来源、草稿、过期revision拒绝，以及即时修订与撤回；这些回归写入只发生于隔离本地D1。浏览器读取3个正式详情，见`browser-acceptance.json`与`production-equipment.jpg`。

本机4320 Payload编辑器继续运行，本次4400测试Worker已停止。批次、草稿隔离、版本历史、同步与线上/服务保护证据分别见`batch.json`、`draft-receipt.json`、`local-publication.json`、`sync-receipt.json`、`production-acceptance.json`和`runtime-protection.json`。

## 维护与剩余顺序

这3条内容的文字/数字维护继续走Payload草稿→发布→`publish:starrail`→详情及目录回读，无需再构建Main。新增其他稳定条目或来源仍须审查路由归属与来源白名单。若回退到不支持`equipment`的旧Main，先在Payload撤回这3条并同步完整兼容副本；不能只回退代码使整份发布校验失败。

本批没有将整个旧图鉴标为已核验。下一批继续当前复刻光锥的完整数值、旧库命途/身份错误及重复项，继而补相关材料独立图鉴与获取途径，再进入国服结构化活动日历。光锥第二独立数值源、两套新饰品具体关卡/掉落与配装比较继续列为待核验。
