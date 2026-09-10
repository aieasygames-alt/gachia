# Azur Promilia 内容建档

Azur Promilia 已接入独立 Worker，但当前部署状态为 `draft`。在官方来源完成核验前，不应把角色、武器、强度榜或兑换码传闻写入生产数据。

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
2. `GAME_DEPLOYMENTS['azur-promilia'].status` 切换为 `preview`。
3. staging Router 与 Worker 完成功能、资源和 SEO parity 检查。
4. canary 验证通过后才切换为 `live` 并打开 `AZUR_PROMILIA_ENABLED`。

