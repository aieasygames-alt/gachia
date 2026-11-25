# Gachia Payload CMS

独立的本机内容管理服务，首批管理《崩坏：星穹铁道》的版本、跃迁、活动。后续已接入独立攻略、阿哈倍率与材料、光锥/遗器以及两批18种材料图鉴。当前生产用法与回执见 [主站维护说明](../../docs/starrail-cms-main-site.md)，初始字段说明见 [维护说明](../../docs/starrail-payload-updates.md)。

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

这里的 Next/Payload 依赖使用独立 npm 锁文件；主站 pnpm 锁文件和 Next 版本无需升级。已配置的编辑端位于 `/Users/robert/Documents/gachia/tools/payload-cms`，主站从云端 D1 读取已发布副本；后台 Publish 后仍须执行 `npm run publish:starrail`，返回成功并核对线上结果才算完成。现有条目的文字与数值修订无需重新构建网站。新增类型、稳定路由或尚未审核的资料来源，需先更新并验收兼容 Main；勿从原工作区旧 Main HEAD 重新部署。

星铁完整发布容量：每语言100条、总计300条，同时受512 KiB UTF-8请求体限制。发布器完整导出并拒绝分页与超限，不会截断旧记录；详见主站维护说明。
