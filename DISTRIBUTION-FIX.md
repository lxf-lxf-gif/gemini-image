# 快速修复指南

## 问题
应用分发给别人后无法打开

## 原因
缺少 electron-builder 配置,导致原生模块(Sharp, exiftool-vendored)未正确打包

## 已修复
✅ 已添加 `electron-builder.yml` 配置文件
✅ 已更新 `package.json` 的 build 配置
✅ 已配置原生模块解包(asarUnpack)

## 下一步操作

### 1. 重新打包应用

```bash
# 清理旧的构建
Remove-Item -Recurse -Force dist

# 重新构建
npm run build
```

### 2. 测试打包后的应用

```bash
# 测试未打包版本
.\dist\win-unpacked\图片批处理大师.exe
```

### 3. 分发

将以下文件发送给用户:
- `dist\图片批处理大师-1.0.0-x64.exe` (安装程序)

### 4. 告知用户

如果用户看到 Windows SmartScreen 警告:
1. 点击 "更多信息"
2. 点击 "仍要运行"

这是因为应用未签名,是正常现象。

## 详细文档

查看完整的分发指南: [distribution-guide.md](file:///C:/Users/0/.gemini/antigravity/brain/42c715da-e195-4ee3-ad80-9d82eeba8297/distribution-guide.md)
