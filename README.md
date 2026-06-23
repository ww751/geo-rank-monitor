# GEO AI 搜索可见度监测平台

面向国内 AI 搜索/问答平台的 GEO Monitor MVP。当前版本聚焦本地可演示和可实操测试：客户建档、关键词生成、AI 回答分析、排名提取、GEO Score、优化任务、内容发布复测、报告导出和分享访问留痕。

## 技术栈

- Next.js 15 + TypeScript
- TailwindCSS
- PostgreSQL
- Prisma 7
- Playwright
- zod
- PDFKit / pptxgenjs

## 系统架构

```mermaid
flowchart LR
  A["客户/品牌/关键词"] --> B["采集任务 monitoring_jobs"]
  B --> C["采集器 Playwright 或模拟数据"]
  C --> D["采集产物 collection_artifacts"]
  D --> E["回答分析 answer_analyses"]
  E --> F["排名提取 ranked_brands"]
  F --> G["监测结果 rank_results"]
  G --> H["GEO Score geo_scores"]
  H --> I["优化任务 optimization_tasks"]
  I --> J["内容资产 contents"]
  J --> K["内容发布 content_publications"]
  K --> L["发布后复测 publication_retests"]
  H --> M["Dashboard / 客户视图 / 报告"]
```

## 数据库结构

核心表：

- `clients`：客户主体。
- `brands`：客户品牌资料。
- `keywords` / `keyword_clusters`：关键词和城市行业关键词簇。
- `ai_platforms` / `platform_sessions`：AI 平台和登录态配置。
- `monitoring_jobs` / `pipeline_runs`：采集任务和流水线步骤。
- `collection_artifacts`：回答原文、截图路径、HTML 摘要和失败 metadata。
- `answer_analyses` / `ranked_brands`：回答分析、品牌识别、排名提取。
- `rank_results` / `citations`：监测结果和引用来源质量。
- `geo_score_runs` / `geo_scores`：评分批次和 0-100 GEO Score。
- `optimization_tasks` / `contents`：优化任务和内容资产。
- `content_publications` / `publication_retests`：内容发布和发布后复测。
- `reports`：月报。
- `client_share_links` / `share_link_access_logs`：客户只读链接和访问日志。

## 本地启动

1. 安装依赖：

```powershell
npm install
```

2. 配置 `.env`：

```env
DATABASE_URL="postgresql://postgres:644196224@localhost:5432/geo_rank_monitor?schema=public"
ADMIN_PASSWORD="644196224"
```

3. 执行迁移和 seed：

```powershell
npx prisma migrate dev
npm run db:seed
```

4. 启动开发服务：

```powershell
npm run dev
```

打开 `http://localhost:3000`，输入 `.env` 中的 `ADMIN_PASSWORD` 进入后台。

## Doubao 登录态

先保存登录态：

```powershell
npm run auth:save-state -- doubao
```

Playwright 会打开 Doubao 页面。手动登录并处理验证码后，回到 PowerShell 按 Enter，系统会保存：

```text
.auth/doubao.json
```

后台进入 `/platform-sessions`，确认 Doubao：

- `storageStatePath` 为 `.auth/doubao.json`
- `status` 为 `READY`
- 首次真实采集建议 `headless: false`

系统不会保存明文账号密码，也不会绕过验证码。

## 单条实操测试

推荐从 `/pipeline-runner` 开始：

1. 点击“一键跑章丘测试”。
2. 默认会创建或使用：
   - 客户：章丘上川装饰测试客户
   - 品牌：上川装饰
   - 关键词：章丘装修公司排名
   - 平台：Doubao
3. 先选择“模拟采集”，确认完整链路成功。
4. Doubao 登录态准备好后，切换“Doubao 真实采集”再跑单条。

检查结果：

- `/collection-artifacts`：回答原文和失败 metadata。
- `/answer-analyzer`：品牌识别、过滤词、引用 URL。
- `/rank-results`：品牌是否出现和排名。
- `/`：Dashboard GEO Score。
- `/optimization-tasks`：自动生成优化任务。
- `/content-publications`：内容发布和复测。
- `/publication-readiness`：部署公网前的发布准备度检查。
- `/improvement-experiments`：提升实验和实质提升判定。

## 一键发布

优化任务页支持两种发布方式：

- 单条任务点击“一键发布”。
- 页面顶部点击“批量一键发布”。

发布后系统会生成公开内容页：

```text
/geo-content/:id
```

公开内容入口：

```text
/geo-content
```

部署前检查入口：

```text
/publication-readiness
```

注意：如果 `NEXT_PUBLIC_SITE_URL` 还是 `http://localhost:3000`，这些页面只在本机可访问，Doubao/Kimi/Tongyi/Yuanbao 无法抓取，也不会真实影响排名。部署到公网后需要改成真实 HTTPS 域名：

```env
NEXT_PUBLIC_SITE_URL="https://your-domain.com"
```

## 后台队列

页面入口：

```text
/monitoring-queue
```

命令行只跑 1 条：

```powershell
npm run worker:monitoring -- --limit=1
```

包含失败任务重试：

```powershell
npm run worker:monitoring -- --include-failed --limit=1
```

当前队列使用 PostgreSQL 轮询，不依赖 Redis。

## 报告导出

页面入口：

```text
/report-exports
```

支持：

- PDF
- PPTX
- 月报摘要
- 提升实验报告

PDF 在 Windows 下使用系统中文字体，避免中文乱码。

## 常见问题

### P1000 Authentication failed

检查 `.env`：

```env
DATABASE_URL="postgresql://postgres:644196224@localhost:5432/geo_rank_monitor?schema=public"
```

确认 PostgreSQL 用户、密码和数据库名一致。

### 打开后台被跳到登录页

这是 Admin Password Gate。输入 `.env` 里的 `ADMIN_PASSWORD`。

### Doubao 真实采集失败

常见原因：

- 登录态过期。
- 页面出现验证码或安全验证。
- 页面选择器变化。
- 网络超时。

失败原因会写入 `monitoring_jobs.failureReason` 和 `collection_artifacts.metadata`。

### 品牌出现率不是 100%

这是当前版本的正确行为。系统会为未出现样本生成 0 分记录，Dashboard 的品牌出现率按真实样本计算。

## 验收命令

```powershell
npm run db:seed
npm run test:brand-resolver
npm run test:ranking-extractor
npm run test:geo-score-engine
npm run test:optimization-tasks
npm run test:improvement-experiments
npx tsc --noEmit
npm run lint
npm run build
```
