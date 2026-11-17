# 异环 Qt 资源容器审计（R125）

生成时间：2026-11-16T05:28:19.364Z

本报告从官方 CDN 的单文件 ZIP 包中解出 `3000001.dat` 与 `Default.dat`，按 Qt RCC v3 头、树、名称表和 payload 读取，未写入客户端或 CMS。

| 资源 | 目录 | 文件 | zlib 文件 | 文本文件 | 文本关键词命中 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 3000001.dat | 50 | 547 | 8 | 61 | 0 |
| Default.dat | 39 | 695 | 28 | 29 | 0 |

扫描关键词：`material`、`anima`、`psyche`、`chaos`、`cosmos`、`incantation`、`lakshana`、`hunter`、`character`、`ascension`、`skill`、`level`。

文本资源没有出现材料表、角色升级、技能、突破或等级字段。二进制资源只按文件清单和 SHA-256 留存，不能把字体或图片中的偶然字节命中当作材料证据。

结论：材料 source-bound plan 仍未生成，`hold=true`；下一步读取 PatcherPath 指向的 Unreal Paks 小型索引或带版本的游戏内导出，继续保持 raw 关系冻结。
