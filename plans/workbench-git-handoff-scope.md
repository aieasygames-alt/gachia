# 工作台文档Git交付候选范围

2026-10-16。已授权本批五文件选择性提交、一次推送和PR验证；不授权合并、部署或产品代码修改。

## 选择性新增材料

- docs/workbench-v1-handoff.md
- docs/workbench-local-user-guide.md
- plans/workbench-v1-delivery-manifest.md
- plans/workbench-git-handoff-scope.md
- reports/workbench/workbench-v1-delivery-summary-2026-10-16.json

提交副本中的使用指南两处项目状态链接改为同批handoff与manifest；该差异需显式审核，
主目录状态入口不需改变。排除依赖历史归档的当前总表、状态流水和首次启动诊断清单。
该清单是候选，不是最终暂存清单；独立工作区以最新远端main为基础，逐SHA审核后冻结。

## 排除

数据库及sidecar、令牌、临时路径原始报告、tar、依赖、历史实验、源码修改、其他游戏内容。
现有Admin README改动和模态回归不属于本批，原样保留；不能整批git add。

## 执行边界

本批允许一次选择性提交、一次推送、一个PR及观察自动只验证CI。
CI会安装现有锁定依赖、准备浏览器、上传验证制品；不等于部署，不能继承已完成网站发布授权。
Cloudflare自动构建禁用证据应复核；若新PR出现意外云端构建则停止，不自动重试。
不得合并、部署、启动服务或写日常业务数据。

## 随后使用顺序

先在停写状态备份现在已创建的新日常库，并在副本检查；不复制整个32GiB历史构建目录。
再选一条HI3国际服官方公告做真实使用，明确来源请求、日常库写入及启动次数上限。
不得复制临时合成验收记录充当真实内容，也不自动创建草案或启动Next预览。
