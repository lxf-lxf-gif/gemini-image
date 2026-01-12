const fs = require('fs');
const path = require('path');

// 读取 App.jsx
const appPath = path.join(__dirname, 'src', 'App.jsx');
let content = fs.readFileSync(appPath, 'utf8');

// 统计替换次数
let count10px = (content.match(/text-\[10px\]/g) || []).length;
let countXs = (content.match(/text-xs/g) || []).length;

console.log(`找到 ${count10px} 处 text-[10px]`);
console.log(`找到 ${countXs} 处 text-xs`);

// 第一步:将 text-xs 替换为临时标记
content = content.replace(/text-xs/g, 'TEXT_BASE_TEMP');

// 第二步:将 text-[10px] 替换为 text-sm
content = content.replace(/text-\[10px\]/g, 'text-sm');

// 第三步:将临时标记替换为 text-base
content = content.replace(/TEXT_BASE_TEMP/g, 'text-base');

// 写回文件
fs.writeFileSync(appPath, content, 'utf8');

console.log('\n✅ 字体调整完成!');
console.log('text-[10px] (10px) → text-sm (14px)');
console.log('text-xs (12px) → text-base (16px)');
