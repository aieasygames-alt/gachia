# R139：原神 Worker 代码及图片资源正式发布完成

日期：2026-11-20。用户已明确授权“原神 Worker 发布上线”。本批从 R134 已发布 A 的完整 115 份来源接续，仅更新 `gachia-game-genshin` 的应用代码和两个 owner 图片资源；正式切流、云预览、公网验收、来源推进及真实读取器重开均完成。

## 正式身份和范围

| 项目 | 结果 |
|---|---|
| 执行源码提交 | `a85e5a67a28f9da905ad98702729b9e99a7338d1` |
| 实际编译提交 | `5b5ff681ced58522853f61bfd1f29dbf6a6f0a17` |
| 完整 CI | [44739474406](https://github.com/aieasygames-alt/gachia/actions/runs/44739474406)，全部要求步骤通过 |
| 旧原神版本 | `2fcd8859-5881-4dbc-aa9c-0b9d558ff8bc` |
| 正式原神版本 | `882906a4-328a-4a3c-ba3a-5e6130a8ed99`，100% 流量 |
| 正式部署 | `c8ea00a0-aafa-4ce2-83e9-7402da34610a` |
| 兼容恢复版本 | `7a582287-242c-4b6a-8364-1aa9e311ba89`，云验收通过，未执行真实回滚 |
| 正式部署请求 | 仅一次 POST；后续接续均为只读验收 |
| 保护服务 | 其余 9 个生产/staging 服务部署身份和设置保持 |

应用已包含 `specialJump → special-jump / special`、`passive3 → passive-3 / passive` 通用技能聚合映射，保留相应可选类型和文本。玛拉妮、欧洛伦的两张 WebP 进入原神 owner 静态资源，精确版本云预览已逐字节核验。规范公开图片域名为 `img.gachia.com`，最终两张 HEAD/GET 共 4 项均 200，GET SHA256 与 owner 资源一致。没有为 held 新角色新增 Main-relative 旧图片别名。

本轮内容输入完全沿用正式 R134 A；115/115 SHA256 保持，胡桃、异环咲里/收藏家剧作核心、Zero canonical 关系、27 个未证实材料的删除状态及攻略增量均保持。没有本轮真实 CMS 文本编辑，也没有将 R135–R138 的材料、配方、新角色候选带上线。绿梦保持现有中文范围。

## 构建及验收

完整 Next/OpenNext 构建实际完成于 `5b5ff68`。之后仅 CMS 读取器审核 pin 与操作 runner 配置发生差异；应用、包、锁文件、构建脚本及 115 份发布内容输入保持，因此复用同一实际构建至 `a85e5a6`，没有声称重新编译后者。证据见 [build-reuse.json](build-reuse.json)。系统 pnpm 自管理递归的失败记录保留，最终使用项目锁定的 pnpm 10.10.0 完成构建。

候选封存模块 SHA256 为 `8d66adc1f9efbd0c3e1fbed08d3292e9eb974ae5eee81fe152bfac854b4d11eb`；恢复模块为 `d5c54106fd40d026c810805d24ab3a28a063bd22f7aa54db02d10bc7508d8653`，精确沿用旧原神 runtime。两方向保留兼容的不可变 Next 静态资源并集。

| 验收 | 候选 | 恢复 |
|---|---:|---:|
| owner 本机 HTTP | 790 | 788 |
| 本机聚合 | 412 | 412 |
| 首轮精确云预览 | 790 | 788 |
| 切流前新鲜精确云预览 | 790 | 788 |

正式切流后的真实公网 Router 412 项、来源推进时再次 412 项全部通过，涵盖页面完整指纹、JSON、搜索、主站聚合、缓存、canonical、robots、保留内容和静态资源。最终独立控制面检查确认只原神版本/部署改变，其余 9 个服务保持；两张 CDN 图片再验通过。详见 [final-audit.json](final-audit.json)。

本机 native Router 启动存在 `spawn EBADF`，因此以精确已发布 Router 模块在 Node 绑定桥执行，其 Main/NTE/Genshin 请求来自真实独立 workerd；这没有记作原生 Router workerd 验收通过。上述两轮公网检查均经过真实生产 Router，覆盖该本机运行方式的限制。

## 已核清的中断

历史 R79 调用回执固定了 Node 25.9.0 的绝对执行路径，初用 Node 22 重开时在上传前被拒绝；历史回执未改写，后续历史读取沿用原执行环境。应用编译使用 Node 22.22.2，本机最终 workerd 编排使用 Node 22.23.4。历史读取环境与应用构建环境分别记录。

首次恢复版本上传成功后，原生下载云模块超时；其 UUID 被保留，未重新上传。后续只读预检也曾超时且未进入候选上传。已用显式 localhost 代理接续原生请求及有界模块下载，两份云模块均完成 ETag、前后版本身份、出站 multipart 与下载字节的交叉核验。失败目录保留，见 [preview-continuation-intent.json](preview-continuation-intent.json)。

正式创建 POST 返回 200 和上述部署 ID，但首次详情 GET 返回 404，执行器停止。随后只读 GET 返回 200，当前 deployments、精确 UUID 和 100% 分配均与创建回执一致；只追加已部署/公网通过回执，没有重放 POST 或执行回滚。见 [promotion-reconciliation.json](promotion-reconciliation.json)、[production.jsonl](production.jsonl)。创建原始回执以已保存的结构化 JSON 绑定；后续成功详情响应保留原始文本与摘要，没有伪造最初响应字节摘要。

## 可直接接续的来源

[R139 最终来源索引](published-sources/source-index.json)，pin：

`59b5831d8547d02b37c4052506e777a11d6d75fbfc1d604a0a3412010cb99fca`

实际 `readNteSourceIndex` 已独立重开该索引，115 来源与 `allOwnersCurrent=true` 通过。原始 [completion.json](completion.json)、[source-result.json](source-result.json)和[delivery.json](delivery.json)固定执行、云版本、模块、公网及下一批入口。R134 与 R138 先前“当批未发布”的回执保留历史，不改写为本轮成果。

下一批从 R139 发布 A 对账真实 CMS import O、R137 完整候选和 R138 图片补丁，再做有界导入与数值、关系、新实体的独立审核/发布/恢复合同。保留先前 10 份本地与发布来源差异；无需重复图片上传、49 个特产取证、1,350 阶段配方比对或本次发布。

回执与队列收尾后，文档及验证范围门禁 39/39 通过，无跳过；`git diff --check` 通过。正式执行提交仍为上列 `a85e5a6`，后续纯记录提交不作为新的应用编译或部署。
