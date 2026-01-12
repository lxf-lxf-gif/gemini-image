# 错误信息收集与解决方案

> 本文档用于记录开发和使用过程中遇到的错误、问题及其解决方案

---

## 📋 错误记录模板

```markdown
### [错误ID] 错误标题
**日期**: YYYY-MM-DD  
**严重程度**: 🔴高 / 🟡中 / 🟢低  
**状态**: ⏳待解决 / ✅已解决 / 🔄进行中  

**错误描述**:
[详细描述错误现象]

**复现步骤**:
1. 步骤1
2. 步骤2
3. ...

**错误信息**:
```
[粘贴错误日志]
```

**解决方案**:
[解决方法描述]

**相关文件**:
- `file1.js`
- `file2.jsx`

---
```

---

## 🐛 已记录的错误

### [ERR-001] 水印图片路径验证失败
**日期**: 2026-01-08  
**严重程度**: 🟡中  
**状态**: ✅已解决  

**错误描述**:
用户选择水印图片后,如果文件被移动或删除,批量处理时会报错但没有明确提示。

**复现步骤**:
1. 选择一张图片作为水印
2. 删除该水印图片文件
3. 点击"开始导出"
4. 处理失败但用户不知道原因

**错误信息**:
```
Error: ENOENT: no such file or directory, open 'C:\path\to\watermark.png'
```

**解决方案**:
在 `handleProcessBatch` 中添加水印路径验证:
```javascript
if (watermarkPath) {
    const validation = await window.electronAPI.validatePath({
        filePath: watermarkPath,
        type: 'file'
    });
    if (!validation.valid) {
        alert(`水印图片验证失败: ${validation.error}\n请重新选择水印图片。`);
        return;
    }
}
```

**相关文件**:
- `src/App.jsx` (L295-L305)
- `electron/main.js` (L100-L128)

---

### [ERR-002] 输出目录写权限问题
**日期**: 2026-01-08  
**严重程度**: 🟡中  
**状态**: ✅已解决  

**错误描述**:
用户选择了只读目录作为输出目录,处理时会失败。

**复现步骤**:
1. 选择一个只读目录(如C盘根目录)
2. 点击"开始导出"
3. 所有图片处理失败

**错误信息**:
```
Error: EACCES: permission denied, open 'C:\output.jpg'
```

**解决方案**:
添加输出目录权限验证:
```javascript
if (outputDir) {
    const validation = await window.electronAPI.validatePath({
        filePath: outputDir,
        type: 'directory'
    });
    if (!validation.valid) {
        alert(`输出目录验证失败: ${validation.error}\n请重新选择输出目录。`);
        return;
    }
}
```

**相关文件**:
- `src/App.jsx` (L307-L317)
- `electron/main.js` (L100-L128)

---

### [ERR-003] 非图片文件导致处理失败
**日期**: 2026-01-08  
**严重程度**: 🟢低  
**状态**: ✅已解决  

**错误描述**:
用户选择文件时可能误选PDF、文档等非图片文件,Sharp处理时会报错。

**复现步骤**:
1. 选择混合文件(图片+PDF)
2. 点击"开始导出"
3. PDF文件处理失败

**错误信息**:
```
Error: Input buffer contains unsupported image format
```

**解决方案**:
添加文件类型过滤:
```javascript
const VALID_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'tif'];

const filterImageFiles = (filePaths) => {
    const validFiles = [];
    const invalidFiles = [];
    
    filePaths.forEach(filePath => {
        const ext = filePath.split('.').pop().toLowerCase();
        if (VALID_IMAGE_FORMATS.includes(ext)) {
            validFiles.push(filePath);
        } else {
            invalidFiles.push(filePath);
        }
    });
    
    if (invalidFiles.length > 0) {
        alert(`已过滤 ${invalidFiles.length} 个非图片文件`);
    }
    
    return validFiles;
};
```

**相关文件**:
- `src/App.jsx` (L4, L56-L73)

---

### [ERR-004] 内存泄漏 - blob URLs未清理
**日期**: 2026-01-08  
**严重程度**: 🟡中  
**状态**: ✅已解决  

**错误描述**:
长时间使用应用,反复添加和删除图片后,浏览器内存持续增长。

**复现步骤**:
1. 添加20张图片
2. 清空列表
3. 重复步骤1-2多次
4. 观察内存使用

**错误信息**:
无明显错误,但内存不断增长。

**解决方案**:
添加blob URL清理逻辑:
```javascript
// 文件变化时清理
useEffect(() => {
    return () => {
        files.forEach(file => {
            if (file.previewUrl && file.previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(file.previewUrl);
            }
        });
    };
}, [files]);

// 组件卸载时清理
useEffect(() => {
    return () => {
        files.forEach(file => {
            if (file.previewUrl && file.previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(file.previewUrl);
            }
        });
    };
}, []);
```

**相关文件**:
- `src/App.jsx` (L111-L133)

---

### [ERR-005] 文件名时间戳冲突
**日期**: 2026-01-08  
**严重程度**: 🟢低  
**状态**: ✅已解决  

**错误描述**:
高速批量处理时,同一秒内处理多张图片可能产生相同的文件名前缀。

**复现步骤**:
1. 批量处理30张图片
2. 检查输出文件名
3. 发现部分文件名时间戳相同

**错误信息**:
无错误,但文件名可能重复(虽然有随机后缀)

**解决方案**:
在时间戳中添加毫秒精度:
```javascript
const timestamp = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0') +
    now.getSeconds().toString().padStart(2, '0') +
    now.getMilliseconds().toString().padStart(3, '0'); // 添加毫秒
```

**相关文件**:
- `electron/image-processor.js` (L251-L259)

---

### [ERR-006] Sharp元数据重复获取
**日期**: 2026-01-08  
**严重程度**: 🟢低  
**状态**: ✅已解决  

**错误描述**:
图片处理过程中,多次调用 `pipeline.metadata()`,影响性能。

**复现步骤**:
代码审查发现性能优化点

**错误信息**:
无错误,性能优化项

**解决方案**:
复用已获取的元数据:
```javascript
// 在第118行获取一次
const currentMetadata = await pipeline.metadata();

// 第151行不再重复获取,直接使用currentMetadata
```

**相关文件**:
- `electron/image-processor.js` (L118, L150-L154)

---

### [ERR-007] SVG水印字体在离线环境失败
**日期**: 2026-01-08  
**严重程度**: 🟢低  
**状态**: ✅已解决  

**错误描述**:
SVG水印尝试从Google Fonts加载字体,离线环境下会失败。

**复现步骤**:
1. 断网
2. 添加文字水印
3. 处理图片
4. 水印可能无法正确渲染

**错误信息**:
无明显错误,但字体可能回退到系统默认

**解决方案**:
移除Google Fonts引用,直接使用系统字体:
```javascript
const textSvg = `
<svg width="${svgWidth}" height="${svgHeight}">
  <text font-family="Arial, sans-serif" ...>
    ${escapedText}
  </text>
</svg>`;
```

**相关文件**:
- `electron/image-processor.js` (L202-L216)

---

### [ERR-008] currentMetadata未定义导致处理失败
**日期**: 2026-01-08  
**严重程度**: 🔴高  
**状态**: ✅已解决  

**错误描述**:
在优化元数据获取后,当用户没有设置边框和圆角时,处理图片会报错 `currentMetadata is not defined`。

**复现步骤**:
1. 导入图片
2. 不设置边框和圆角(保持为0)
3. 点击"开始导出"
4. 处理失败,提示 `currentMetadata is not defined`

**错误信息**:
```
ReferenceError: currentMetadata is not defined
    at processImage (image-processor.js:152)
```

**原因分析**:
在bug修复ERR-006时,为了避免重复获取元数据,将 `currentMetadata` 的定义放在了 `if (options.borderRadius > 0 || options.borderWidth > 0)` 块内。但后续水印功能需要使用这个变量,当if条件不满足时,变量未定义。

**解决方案**:
将元数据获取移到if块外,确保始终可用:
```javascript
// 移到if块外
const currentMetadata = await pipeline.metadata();
const w = currentMetadata.width;
const h = currentMetadata.height;

if (options.borderRadius > 0 || options.borderWidth > 0) {
    // 使用 w 和 h
    const r = options.borderRadius || 0;
    // ...
}

// 后续代码可以安全使用 currentMetadata
const imageWidth = currentMetadata.width || 1000;
```

**相关文件**:
- `electron/image-processor.js` (L116-L154)

**教训**:
优化时要考虑变量的作用域,确保所有使用该变量的地方都能访问到。

---

## 📊 错误统计

| 严重程度 | 数量 | 已解决 | 待解决 |
|---------|------|--------|--------|
| 🔴 高 | 1 | 1 | 0 |
| 🟡 中 | 3 | 3 | 0 |
| 🟢 低 | 4 | 4 | 0 |
| **总计** | **8** | **8** | **0** |

---

## 🔍 常见问题排查

### 应用启动失败
1. 检查Node.js版本(推荐v18+)
2. 删除node_modules,重新安装
3. 检查Electron版本兼容性

### 图片处理失败
1. 检查图片格式是否支持
2. 检查输入路径是否正确
3. 检查输出目录权限
4. 查看控制台错误日志

### 水印不显示
1. 确认水印路径正确
2. 检查水印图片格式
3. 确认水印位置设置
4. 检查文字水印文本是否为空

### 内存占用过高
1. 清空图片列表
2. 重启应用
3. 减少单次处理的图片数量

---

## 📝 报告新错误

如果遇到新的错误,请按照以下格式添加到本文档:

1. 复制错误记录模板
2. 填写完整信息
3. 包含错误截图(如有)
4. 描述复现步骤
5. 记录错误日志

---

**最后更新**: 2026-01-08  
**维护者**: 开发团队
