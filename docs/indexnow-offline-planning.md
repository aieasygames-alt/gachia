# IndexNow 离线候选计划与外发暂停

更新：2026-10-24，S2.12。当前是候选比较工具，不是已启用的搜索提交服务。

## 1. 当前策略

`packages/core/indexnow-policy.mjs` 统一声明 `paused`。两个手工 CLI、站内 API 与 server-only helper 均移除外发实现，没有环境变量、`--force` 或认证令牌绕过入口。两个事实 holds 和多 owner 生产验收仍未完成；即使以后关闭 holds，也不会自动恢复发送。

本地代码尚未部署，因此不能声称现有生产 API 已暂停，或搜索引擎已经撤销历史提交。本站采用保守暂停，不代表 IndexNow 协议禁止发送 noindex、移除或删除通知；这些通知需要独立的用途、审批和实现，不能混入当前“发现/推广”候选流程。

## 2. 日常使用

没有 `--submit` 也不会外发。`--dry-run` 保留兼容，但默认本来就是离线计划。

```sh
# 显式新增候选，不从新增页面模板猜测所有游戏地址。
pnpm indexnow:new-pages -- --path /en/roco/characters

# 查看历史优先清单。清单是历史候选，不是批准列表。
pnpm indexnow:seo-updates -- --priority --dry-run

# 与已经完成生成的本地 urlset 比较；路径必须真实存在。
node scripts/indexnow-submit-seo-updates.mjs --priority \
  --sitemap apps/web/.next/server/app/sitemaps/main/sitemap.xml.body
```

需要机器读取的 JSON 时直接使用 `node` 或 `pnpm --silent`，避免 pnpm 的命令提示混入 stdout。计划默认只输出到终端，不自动生成另一套数据库、候选清单副本或磁盘档案；确需留档时由维护者显式重定向到 `.release-records/`。

可重复 `--path`、`--url` 和 `--sitemap`。快照只接受本地、完整、命名空间正确的 XML `urlset`，不接受根 `sitemapindex`，也不会自动请求子图。比较其他 owner 时，应显式提供对应 urlset；只提供主站文件就不能推断原神等独立 owner 的页面状态。不要在构建仍清除或重写文件时读取快照，优先使用完成验收后保存的稳定文件。

以下命令会以非零退出，不会先发请求再报告失败：

```sh
pnpm indexnow:new-pages -- --path /zh --submit
pnpm indexnow:seo-updates -- --priority --submt
```

仅运行 `indexnow:new-pages` 而不指定候选也会拒绝。Git 新增模板、核心游戏注册、导航开关都不证明存在对应公共页面，旧的“新增 version 模板乘以全部游戏及语言”逻辑已经移除。

## 3. 如何读计划

| 字段 | 意义 |
|---|---|
| `mode=offline_plan_only`、`networkRequests=0` | 此实现不执行 HTTP，不是一次生产提交尝试 |
| `submissionApproved=false`、`submissionAllowed=false` | 无论快照结果如何，全部候选都未获提交批准 |
| `not_assessed` | 没有提供快照，不猜测索引资格 |
| `listed_in_supplied_snapshot` | 只证明命中所给文件中的 loc，不证明当前线上 200、canonical、robots、来源或事实正确 |
| `not_listed_in_supplied_snapshots` | 未命中所给文件；可能是不提交，也可能是缺少某个 owner 的文件，不自动解释为 404、退役或 noindex |
| `snapshots[].sha256` | 本次实际读取文件的摘要，便于追溯；没有隐含封存、时效或发布批准 |

URL 必须是 `https://gachia.com` 下的三语言 ASCII 页面路径。拒绝凭据、端口（包括显式 443）、query、fragment、编码路径、重复斜杠、尾斜杠、点段、协议相对地址和其他主机。候选原始数量上限 10,000，先验证完整批次再去重，混合非法 URL 不会被悄悄丢弃后继续提交。当前保守路径格式若不支持未来合法 URL，必须经测试扩展，不能绕过验证器。

XML 用标准解析器读取，限制每文件 10 MiB、最多 16 个文件及每文件 50,000 个 URL；拒绝 DTD/entity、重复 loc 与跨文件重复地址，避免用正则提取或重叠 owner 静默掩盖问题。快照没有证明正文/metadata 与 XML 一致，也不能据此重新批准仍在审核的兑换码页面。

## 4. 站内兼容行为

- API 没有配置 secret 时仍为 503，错误 Bearer 为 401；非法 JSON/URL 批次为 400。合法认证请求明确返回 503、`ok=false`、暂停原因和 `submissionApproved=false`，不返回伪“通知成功”。遇到暂停应进入人工审查，不不断重试。
- helper 保留 async/void 兼容接口，非法输入记录错误，合法输入记录暂停；两者都不执行 HTTP，也不将正常 resolve 当作提交成功。
- 未移除 `INDEXNOW_AUTH_TOKEN` 的发布 secret 要求，也未修改公开验证 key 文件。认证与内容批准是不同边界。
- 编译验收先检查旧外发端点字符串，发现旧 sender 则拒绝启动带合成令牌的 fixture；随后只向回环地址测试 API 的 401/400/503。该检查是防旧产物回归，不是通用网络沙箱或全站无网络证明。

## 5. 将来恢复的最小条件

恢复发送必须另立开发批次，不能只把 `paused` 改成 enabled：

1. 结案相关事实 holds，并明确发现/推广与移除通知的不同目的和允许集合。
2. 核实根图与全部 owner 的生产 HTTP、正文、语言、canonical、robots、退役和静态资源，固定候选对应的实际生产版本。
3. 在发送前重新检查当前页面与源审批，拒绝重定向、错误、缺译、审核中和来源未决的推广候选；本地清单不替代现场检查。
4. 设计显式批准、限量、超时、逐端点结果、部分失败和可重试记录；成功接收不能写成已收录、已排名或已删除缓存。
5. 先通过可拦截传输的离线测试和受控验收，再单独获得外发授权；不得用搜索引擎或 Actions 发现普通代码错误。

本批另外发现兑换码页面仍有旧测试日期、奖励/平台及来源背书，物品通用页仍可能提供 Coming Soon 占位。下一内容批次应先按实际可达性处理这些断言，而不是让离线计划替其取得批准。
