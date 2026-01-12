# AI Image Generator - Web Demo

在线演示版的 AI 图片生成工具，支持文字转图片和参考图功能。

## 功能特性

- ✨ AI 文字转图片生成
- 🖼️ 参考图上传（可选）
- 🎨 支持 Google Gemini 和 Vector Engine API
- 💾 浏览器本地处理，无需上传服务器
- 📥 一键下载生成的图片

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 部署到 Vercel

1. 安装 Vercel CLI
```bash
npm i -g vercel
```

2. 部署
```bash
vercel deploy
```

## 使用说明

1. 点击右上角设置图标配置 API Key
2. 选择 API Provider (Google Official 或 Vector Engine)
3. 输入您的 Gemini API Key
4. (可选) 上传参考图
5. 输入文字描述
6. 点击"生成图片"按钮
7. 下载生成的图片

## 技术栈

- React 18
- Vite
- Lucide React (图标)
- Gemini API

## 注意事项

- API Key 仅存储在浏览器 localStorage
- 所有处理都在浏览器端完成
- 生成的图片不会上传到服务器
