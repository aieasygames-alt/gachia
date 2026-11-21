# R146：公开站 Next.js 15.5.29 安全补丁

当前状态：实施中，尚未上传版本或改变正式部署。R145 收尾 CI 44899555714 已成功。

范围固定为 Main、Genshin、NTE、Azur Promilia、绿梦五个 Next 应用；Router 不依赖 Next，保留其正式模块与部署。CMS 16.4.6 和独立锁不改。公开数据从 R143 的 115 份已发布来源冻结覆盖，不使用 checkout 的历史差异替换线上内容；R144 CMS AFTER 不重放。

15.5.29 官方 tarball integrity 已核验，四处 absent-prefetch 修改成功移植，patch 字节与 15.5.28 相同；原版及修改后的逐文件 SHA256 由独立 manifest 固定。五应用实际解析均为 15.5.29，OpenNext 1.20.13 / Wrangler 4.148.0 保持。注册表依赖变化仅 Next 家族，未改变其他包版本。相关运行时、patch 反向/正向与发布拓扑门禁已通过。

完整和 production audit 结果分别保存。目标 Next 已不匹配原有三类公告；全依赖图仍有 better-auth、qs、glob、minimatch 等公告匹配，不能称为全仓无漏洞。账号功能保持关闭，其他依赖按独立边界后续处理。详细范围见 security-assessment.json。

接下来逐 owner 构建 Next/OpenNext，封存候选与保持旧 runtime 的双向静态资源并集，分别验本机、独立消费者与聚合、云候选/恢复预览；精确提交完整 CI 通过后，按五 owner 顺序受控上线。每次上传和部署均先写意图；未知结果只读对账，不重放。正式版本、恢复 UUID、验收结果及最终来源索引在完成后补齐。
