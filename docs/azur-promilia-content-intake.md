# Azur Promilia 内容建档

Azur Promilia 已接入并运行于独立 Worker，当前部署状态为 `live`。生产 Router 已开启 `AZUR_PROMILIA_ENABLED=true`。页面可以公开访问，但角色战斗信息、武器、强度榜和兑换码仍必须遵守来源状态标注，不得把 CBT 或传闻当作正式事实。

## 当前实现状态（2026-09-12）

- 角色图鉴：19 条角色档案，官方人物设定与 CBT 参考明确区分。
- Kibo 图鉴：支持元素、生活技能和派遣设施筛选，并提供生产设施索引。
- 角色工具：支持角色对比与角色-Kibo 参考匹配。
- 养成规划器：支持角色、武器、Kibo 目标及等级缺口；正式材料数量尚待核验。
- 版本页：追踪上线时间、平台地区、测试资格的官方确认状态。
- 兑换码页：已支持地区、有效期、来源和最后核验字段；当前无官方核验代码。
- 武器页：仅发布系统级 CBT 参考，具体武器数组仍为空。

## 验证与部署

- `@gachia/data validate`：通过。
- Azur Worker `type-check`、内容审计、`verify:bundle`、`next build`：通过。
- Router 测试：14 项通过。
- 生产 Worker 已部署：`gachia-game-azur-promilia`，版本 ID `f6d9b83d-7bfc-4769-90e7-ddaca552c577`。
- 当前终端环境访问 `workers.dev` smoke 请求超时，需在可访问 Cloudflare 的网络环境重新执行生产 smoke。

## 收录要求

- 每条角色、武器和版本信息都要记录官方来源 URL 与核验日期。
- 中文、英文、日文名称必须能追溯到同一条官方资料；缺失语言不应伪造翻译。
- 兑换码必须有地区、有效期、来源和最后核验时间。
- 强度榜必须绑定版本号，并说明评估范围和证据状态。
- 图片进入 R2 前记录版权/授权状态，路径使用 `games/azur-promilia/`。

## 数据入口

```text
packages/data/games/azur-promilia/
  characters.ts
  weapons.ts
  items.ts
  tier-lists.ts
  raw-characters.json
```

数据填充后运行：

```bash
pnpm --filter @gachia/data validate
pnpm --filter @gachia/game-azur-promilia type-check
pnpm --filter @gachia/game-azur-promilia verify:bundle
```

## 上线门槛

1. 首批内容通过来源复核。
2. 新增内容先在 staging 或受保护 origin 完成功能、资源和 SEO parity 检查。
3. 生产变更后执行 `AZUR_PROMILIA_ORIGIN=<origin> pnpm run audit:production`。
4. 若需回滚，将 `AZUR_PROMILIA_ENABLED` 设为 `false` 并重新部署 Router；独立 Worker 可保留用于后续修复。
