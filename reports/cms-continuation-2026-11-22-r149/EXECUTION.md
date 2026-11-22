# R149 常驻 CMS 接续与空间恢复

2026-11-22：已安装精确源码 `f4fe65ecbf26d6b2820e70a8411c33cb488cb0fc`，完整 CI 44977195776 成功。新安装的真实来源读取器在准备后、安装后分别重开 R148，均为 115 来源、五 owner、allOwnersCurrent=true。

安装使用 Next 16.4.6 / Payload 3.92.1 / React 19.2.6，依赖和 schema 保持。标准构建、类型、20 项来源合同、15 组隔离 PostgreSQL/HTTP、20 项常驻 HTTP 均通过。完成冷备真实恢复及新→旧 R147→新往返切换；43 表、序列、媒体及 2,966 条 CMS draft/published 全部保持。六生产和四 staging 部署/配置保持。本批没有内容或审核写入、Worker 上传或正式部署。

删除三个经来源读取、引用与进程占用检查确认可再生成的叶目录；没有删除其父级发布证据。316 份历史 multipart 使用 macOS 透明压缩，路径、逻辑字节、SHA256、权限逐份复核一致。APFS 共享导致前两处依赖目录删除几乎不释放空间，不能用目录标称大小宣称释放量。最终可用约 14.84 GiB，满足标准游戏构建 14 GiB 门槛，继续保留 8 GiB 安全线。

权威交付：[delivery.json](./delivery.json)，全量校验：[validation.json](./validation.json)。正式内容仍接续 [R148 source-index.json](../dependency-security-2026-11-22-r148/published-sources/source-index.json)，pin `e364a23c8e9635db8e06344ff11980f25ef6a14fe87a7a6856a58523ea87957b`。CMS 本批观测为 [cms-final.json.gz](./cms-final.json.gz)，内容与 R144 AFTER 相同。

下一步依次完成蓝色星原持续编辑与第二次真实 CMS 单 Worker 发布、原神 passive3/specialJump 文本发布支持。历史草稿、审核、上传和正式部署不重放。
