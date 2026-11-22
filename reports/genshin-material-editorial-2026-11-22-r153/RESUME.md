# R153 已完成，禁止重放

原神已正式发布 `0b8a10c8-2fad-4fdf-a8fc-fcab385d6eb6`；2 个上传、1 次正式部署，只有原神部署变化。完整结果见 [EXECUTION.md](./EXECUTION.md) 和 [delivery.json](./delivery.json)。

下一批来源：[source-index.json](./published-sources/source-index.json)，pin `cc71a49160ba622a34eaf5d05bfe21006bfa41a0632f208b57afd36e10376340`。CMS：[cms-after-production.json.gz](./cms-after-production.json.gz)，pin `25cdf13bc414f8d803e7a36a6a720eb5f1a6f50d8b3b9330df4e899cccbbe732`。从这些写入后状态接续，禁止重放本批草稿、审核、上传、切流。

执行源码 `e7773d1aee9228377e0a370670ca3b5d24797303`；有效准备为 prepare-02/build + prepare-03/sealed，prepared-final.json / request-final.json / ci-router-fix.json 为正式输入。prepare-01 和 prepare-02/failure.json 是已处理失败记录。常驻 CMS 最终安装及来源重开见 cms-install/attempt-03。
