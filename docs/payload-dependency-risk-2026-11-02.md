# Payload deepmerge 临时风险决定

## 2026-11-22 R148 当前复核：公告已被官方撤回

GitHub 官方 [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) 于 **2026-11-16 18:55:38 UTC** 撤回，当前说明为 “does not describe a security vulnerability”。本次独立 CMS audit 为 0；deepmerge 仍为 4.3.1，没有包升级、忽略规则或本地补丁。见 [当前官方原始记录](../reports/dependency-security-2026-11-22-r148/cms-deepmerge-current-advisory.json)。

因此下方“公告未撤回”和到期风险接受均为历史记录，不再作为待修复公告沿用；保留原始复现和当时的边界决定。撤回不代表应用依赖已升级，也不构成开放公网/多人 CMS 或不可信 JSON 导入的授权；现有本机单用户运行范围保持。

## 历史决定

初始决定：2026-11-02；最新复核：2026-11-05 R37；复核截止仍为2026-11-16，不顺延。适用当前 **Mac 本机单用户/可信来源**，不适用公网、Tunnel 或多人后台。用户已给予推进上线所需操作默认授权；本记录是限定运行边界下的临时接受，不是漏洞修复或全平台安全批准。

## 最新复核（R37，已复核但未修复）

新鲜生产依赖audit仍1low、0moderate/high/critical，audit按预期非零退出；GitHub官方公告未撤回且无first_patched_version，npm registry最新deepmerge仍4.3.1。源码和实际安装依赖入口均与原复现SHA一致，因此原返回对象原型污染及实际Payload合并路径风险继续成立；没有重新声称完整HTTP利用已复现或不可达。本机9项安全HTTP与单用户loopback边界保持，未升级/降级、打补丁或修改安装依赖。首次pnpm registry查询及虚拟路径解析失败不当作无漏洞证据，改用只读npm查询与真实包路径核对；原失败保留。证据见[R37](../reports/payload-postlaunch-operations-2026-11-05-r37/README.md)。

## 已确认的事实

- 重新执行 `pnpm --dir services/content-cms audit --prod --json`：1 low，0 moderate/high/critical，路径 payload 3.92.1 → deepmerge 4.3.1。
- 公告 [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)，CVE-2026-93753：4.2.0–4.3.1 的 mergeObject 未充分处理目标对象中的特殊键，可能污染**返回对象的原型**。公告 severity=low，CVSS=5.3；保留两种原始评级，不把它改称无风险。
- 当前公告没有可用修复版本；没有盲目降级到旧版、替换 Payload 或修改已安装 node_modules。audit 仍非零退出。
- 在源码依赖和**实际安装**依赖分别复现：以含自有 `__proto__` 的 JSON 对象为 target 合并，返回对象继承探针属性，却无相应 own property。全局 Object.prototype 未变化；这不减免返回对象上的安全影响。两处依赖文件摘要一致。
- Payload 的 `fields/hooks/beforeChange/promise.js` 使用 deepMergeWithSourceArrays(doc, data) 和 sibling 合并，属于实际文档校验路径，不只用于静态配置。因此不宣称不可达；尚未证明完整 HTTP 权限绕过或实际内容库可触发利用，也不能据此推定不存在。

## 接受条件与现有缓解

1. CMS/PG 只监听127.0.0.1，单一可信 owner，公网网站不调用 CMS；不开放任何远程编辑/Tunnel/端口映射。
2. 实际网络复验：登录页/health 200，匿名内容接口403，非本机 Origin/错误 Host/cross-site 请求均403。使用原始 HTTP 客户端验证 Host，不依赖可能重写 Host 的 fetch。它们是边界缓解，不是 deepmerge 修复。
3. 首发只修改已有指南文本；来源为已有受控数据，不开放第三方任意 JSON 导入或不可信管理员操作。身份/版本门禁保留，媒体新增仍需权利证明。
4. 保持冷备及已有本地恢复能力；不以 GraphQL 禁用、原文暂存或内容准确度后置作为整个 CMS 的风险豁免。恶意本机进程、可信账号被盗、存储数据污染仍有残余风险。

## 退出条件

到2026-11-16前复核公告、Payload/依赖版本和实际可达性；若出现官方修复，优先通过隔离锁文件更新、CMS测试/typecheck/build、安装版本验证后升级。改为远程/多人或接入不可信数据、评级升高、发现利用时，本接受立即失效，须先缓解/修复再扩大运行范围。

本轮没有设置自动提醒或长期监控。证据：`reports/payload-operations-handoff-2026-11-02/dependency-audit.json`、`dependency-review.json`。不将此项标记为“0漏洞”。
