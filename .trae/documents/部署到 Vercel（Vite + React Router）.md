## 现状判断
- 项目为 Vite + React + TypeScript，构建产物默认输出到 `dist`（见 [package.json](file:///d:/fultter-app/seo-writer-web/package.json)）。
- 已使用 `BrowserRouter`（见 [main.tsx](file:///d:/fultter-app/seo-writer-web/src/main.tsx)），因此 Vercel 需要配置“所有路由回退到 index.html”，否则刷新 `/writer` 之类路径会 404。

## 目标
- 将 `seo-writer-web` 部署到 Vercel，并保证 React Router 路由刷新不报 404。

## 计划步骤
### 1) 添加 Vercel 路由回退配置
- 在 `seo-writer-web/` 下新增 `vercel.json`：
  - 设置 `rewrites`：把所有请求重写到 `/index.html`（SPA fallback）。
  - 这样 `/writer`、`/history`、`/settings` 刷新都能正常。

### 2) 确认 Vercel 构建设置（Monorepo 根目录）
- 在 Vercel 新建项目时：
  - **Root Directory** 选择 `seo-writer-web`
  - **Framework Preset** 选择 Vite
  - **Build Command**：`npm run build`
  - **Output Directory**：`dist`
  - **Install Command**：`npm install`

### 3) 部署方式（二选一）
- **方式 A：Vercel Dashboard（推荐）**
  - GitHub 导入仓库 → 选择 Root Directory → Deploy。
- **方式 B：Vercel CLI**
  - 本地在 `seo-writer-web` 目录执行 `vercel` 完成首次绑定，再 `vercel --prod` 发布。

### 4) 上线后验证
- 打开生产域名：
  - 直接访问 `/`、`/writer`、`/settings`
  - 在 `/writer` 页面刷新（F5）确保不 404

## 我将做的代码改动（等待你确认后执行）
- 新增一个文件：`seo-writer-web/vercel.json`（仅用于 SPA 路由回退；不改业务逻辑）。
- 如有需要，再补充 README 的部署说明。