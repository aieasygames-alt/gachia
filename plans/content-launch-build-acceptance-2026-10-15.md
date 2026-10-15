# 内容批次本地构建与页面验收

日期：2026-10-15。承接 content-launch-development-2026-10-15.md。

## 依赖恢复

- 使用 pnpm 10.10.0 执行 CI=true pnpm install --frozen-lockfile --offline，按现有锁文件重建忽略的node_modules。
- 752包从本地缓存恢复，网络下载0，package.json / pnpm-lock.yaml无变更；未直接修改pnpm store或复制补丁文件。
- 五个应用各自执行require-patched-next门禁，均确认Next15.5.18四个文件为patched。
- 安装报告unrs-resolver构建脚本被忽略；没有为消除警告扩大脚本授权。后续实际构建成功。
- 构建/本地Next服务采用仓库.nvmrc指定的Node20（本机已有运行时），没有安装新运行时。

## 构建

- apps/web、game-lvmeng、game-genshin、game-nte、game-azur-promilia的Next生产模式构建均通过。
- 主站生成7520静态页；仍有原有auth-dialog.tsx effect cleanup ref的非阻断lint警告，未改无关认证代码。
- 原神390px验收发现顶部工具栏溢出，增加480px以下flex-wrap，重新构建通过；320px与390px文档宽度独立复核均无溢出。
- 本次是Next production server验收，不是OpenNext/Cloudflare Worker产物构建、dry-run、staging或线上发布。

## 浏览器验收

可复跑：node scripts/content-launch-browser-check.mjs（先启动本地3110主站、3111绿梦、3112原神、3113异环、3114蓝色星原）。

固定1440×1000和390×844两种宽度，共12条路径/24项；检查HTTP200、关键正文、canonical、页面横向溢出、浏览器pageerror与Next资源失败，保存截图。

- 绿梦：首页、下载、福利兑换码、何雨莲详情、开服核验台；核验台勾选重载后保留。
- 主站：更新雷达、崩铁版本、绝区零前瞻复盘、鸣潮心/锁暝专题。
- 独立站：原神版本、异环版本、蓝色星原版本。
- 验收时阻止广告/统计第三方请求，不能据此声明广告或统计正常；未登录、未做付费或真实游戏客户端实测。
- 证据：reports/content-launch/browser-2026-10-15.json及同目录截图。
- 本地绿梦sitemap200，10个角色条目，含何雨莲与10/15日期；证据sitemap-local-2026-10-15.json。

## 回归与限制

- 恢复依赖后主站50测试文件/174项通过，robots策略2项通过，新鲜度规则0风险/110历史归档匹配，git diff --check通过。
- 可用磁盘由约12GiB降至约10GiB；没有清理用户资料、旧报告或其他任务构建。
- 没有提交、推送、GitHub Actions、Cloudflare部署或数据库写入。
- 当前工作区混有其他任务修改，本地构建不等于已冻结可发布源码。下一步应精确审阅本批文件、固定交付输入，再执行OpenNext产物与预发布/回滚门禁；不能直接git add .或将本地Next验收当Worker上线验收。

## 停服时读取的服务日志补充

- 主站本地服务的认证接口记录BETTER_AUTH_SECRET缺失/不足32字符。页面正文、资源与pageerror检查通过不代表会话接口正常，本轮没有提供真实生产密钥或验证登录；这是明确的未通过范围，而不是忽略的浏览器异常。
- 绿梦Next服务提示多锁文件导致workspace root推断到/Users/robert/package-lock.json；本轮未删用户锁文件。OpenNext交付前应显式固定outputFileTracingRoot并核对产物边界，不能把本次Next页面检查当产物自包含证明。
- 最终浏览器报告24/24通过；只指本报告限定的内容/布局/资源/本地勾选检查。5个本轮启动的本地Next服务均已停止。
