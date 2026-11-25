# Gachia Payload CMS

独立的本机内容管理服务，首批管理《崩坏：星穹铁道》的版本、跃迁、活动。中文使用流程、接入范围和生产前提见 [维护说明](../../docs/starrail-payload-updates.md)。

使用 Node 24.22.3，在本目录运行：

```sh
npm ci --legacy-peer-deps
npm run setup
npm run seed:starrail
npm run dev
```

打开 <http://127.0.0.1:4320/admin> 创建管理员。默认导入草稿，审核后发布；重复导入不覆盖已有记录。SQLite 和随机密钥只保存在本地忽略目录，不提交 Git。

```sh
npm test
npm run type-check
npm run build
```

这里的 Next/Payload 依赖使用独立 npm 锁文件；主站 pnpm 锁文件和 Next 版本无需升级。初次主站接入仍需配置 `PAYLOAD_CMS_URL` 并部署代码；随后在已接入的版本页发布内容无需重新构建网站。未完成云端 CMS 主机、数据库迁移或生产发布验收。
