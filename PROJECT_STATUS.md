# 项目状态

## 当前版本

v1.0 实操测试版

目标：本地可演示、可跑单条真实采集、可生成优化任务、可做内容发布后复测、可导出客户报告。

## 已完成模块

- 客户管理、品牌资料、竞品、关键词库、关键词生成器。
- AI 平台管理和 Playwright 登录态配置。
- Doubao 单条真实采集入口，支持模拟采集和真实采集切换。
- 采集任务队列和后台 worker 命令。
- 采集产物保存，失败时记录 metadata 和失败原因。
- AI Answer Analyzer：品牌识别、过滤词、URL 提取、置信度和提取轨迹。
- Ranking Extractor：推荐名单和排名顺序提取。
- GEO Score Engine：0-100 归一化，未出现样本生成 0 分。
- Dashboard：GEO Score、品牌出现率、TOP3 出现率、引用来源数、关键词数、趋势和 Share of Voice。
- 优化任务：低分关键词、未进 TOP3、缺引用、竞品占位和覆盖不足。
- 内容草稿生成、标记发布、安排复测和立即复测。
- 优化任务批量一键发布到自有 GEO 内容站。
- 公开内容页：`/geo-content/:id`。
- 公开内容首页：`/geo-content`。
- `sitemap.xml` 和 `robots.txt`。
- 发布准备度检查：`/publication-readiness`。
- 内容发布复盘：`content_publications`、`publication_retests`。
- 引用来源质量：有效性、来源类型、权威分、最后检测时间。
- 客户只读分享链接和访问日志。
- Admin Password Gate：后台密码从 `.env` 的 `ADMIN_PASSWORD` 读取。
- PDF/PPTX 报告导出，PDF 使用中文字体。
- README 已补充启动、测试、Doubao 登录态和常见问题。

## 可实操链路

1. `/pipeline-runner` 运行章丘上川装饰测试。
2. `/collection-artifacts` 查看回答原文或失败 metadata。
3. `/answer-analyzer` 查看识别结果。
4. `/rank-results` 查看品牌出现和排名。
5. `/` 查看 Dashboard 指标变化。
6. `/optimization-tasks` 生成草稿、批量一键发布、立即复测。
7. `/content-publications` 查看发布记录和复测结果。
8. `/publication-readiness` 检查公网部署前是否满足真实复测条件。
9. `/geo-content` 查看公开内容站。
10. `/improvement-experiments` 查看提升实验和实质提升判定。
11. `/report-exports` 导出 PDF/PPTX。
12. `/share-link-access-logs` 查看客户访问留痕。

## 已知限制

- 不绕过 Doubao/Kimi/Tongyi/Yuanbao 的验证码或安全验证。
- 当前真实采集优先验证 Doubao，其他平台保留配置入口。
- 后台权限是 MVP 级密码保护，不是正式多用户 RBAC。
- 队列使用 PostgreSQL 轮询，不是 Redis/BullMQ。
- 引用来源检测是轻量规则，不等同于正式 SEO 权重评估。
- 内容发布后的真实排名提升需要平台重新采集确认，模拟复测只用于演示闭环。
- `NEXT_PUBLIC_SITE_URL` 为 localhost 时，自有内容站只用于本地验证，不能影响真实 AI 平台排名。

## 下一阶段计划

- 部署到公网 HTTPS 域名，并把 `NEXT_PUBLIC_SITE_URL` 改为真实域名。
- 接入 Kimi/Tongyi/Yuanbao 的稳定采集选择器和登录态检查。
- 增加采集限速、账号健康检查、失败告警和重试退避。
- 做正式多客户权限、角色和客户独立数据隔离。
- 引入定时调度服务，自动执行每日/每周监测。
- 增强引用质量评分，接入更多本地生活、媒体和权威来源识别。
- 增加内容发布后的 7/14/30 天复盘提醒。
- 将报告模板产品化，支持客户品牌样式和可编辑摘要。
