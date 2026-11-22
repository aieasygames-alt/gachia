# Public dependency applicability baseline

2026-11-22 R148 更新：下方为 2026-11-05 的历史适用性记录。官方 registry 现已确认发布 Better Auth / adapter **1.7.7**；本地已精确升级并通过边界测试，all/prod audit 为 0。不能再使用“未证实发布”描述当前候选；线上状态以 [R148 回执](../reports/dependency-security-2026-11-22-r148/EXECUTION.md)为准。账号功能继续关闭。独立 CMS 本次当前扫描也为 0；历史 deepmerge 公告已于 2026-11-16 被官方撤回（不是依赖升级），详见 [当前复核](payload-dependency-risk-2026-11-02.md)。

核验日期：2026-11-05。公开锁文件 Better Auth 1.6.22；账号开关保持 `accountFeatures:false`。这是逐项适用性分析，不是忽略名单、修复版本证明或生产安全豁免。

| 公告 | 严重性 | 利用前提 | 当前配置及处置 | 必须重审的变化 |
| --- | --- | --- | --- | --- |
| GHSA-965c-763c-88jm | critical | Magic Link 与 OAuth state 相关流程 | `apps/web/lib/auth.ts` 只启用nextCookies，无Magic Link；可选Google但所有账号入口关闭。保留锁文件命中，不宣称可利用或已修复 | 开启账号、Magic Link、OAuth或修改回调 |
| GHSA-r4xp-prcw-77qf | high | OAuth Proxy | 未注册OAuth Proxy插件，账号关闭；不新增插件 | 引入代理插件/跨域登录 |
| GHSA-q84f-53jg-9ppm | high | deviceAuthorization | 未注册deviceAuthorization，账号关闭 | 增加设备授权流程 |
| GHSA-44jh-23m7-hpcf | low，多adapter命中 | PostgreSQL数据库限流路径 | 公共auth配置为Drizzle SQLite，不是CMS的PostgreSQL；不可把两个数据库混同 | 更换公共auth适配器/启用数据库限流 |

公开audit共6个package findings、4个不同公告。禁止仅为清除扫描数升级至未证实发布的1.7.7。后续先核验registry中真实发布版本、公告修复范围及迁移影响，再更新独立锁文件和回归。账号功能启用前必须重新扫描并重新批准，当前“未启用前提”不能沿用到启用后。

CMS独立锁文件deepmerge仍1low，限定单用户loopback风险接受复核日保持 **2026-11-16**，不延期、不扩大信任边界。见[原风险决定](payload-dependency-risk-2026-11-02.md)。公网账号、CMS登录与CMS数据库是不同攻击面。
