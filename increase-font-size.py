import re

# 读取文件
with open(r'd:\Image Marketing\src\App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 第一步:将 text-xs 替换为 text-sm (临时标记)
content = content.replace('text-xs', 'TEXT_SM_TEMP')

# 第二步:将 text-[10px] 替换为 text-sm
content = content.replace('text-[10px]', 'text-sm')

# 第三步:将临时标记替换为 text-base
content = content.replace('TEXT_SM_TEMP', 'text-base')

# 写回文件
with open(r'd:\Image Marketing\src\App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("字体调整完成!")
print("text-[10px] → text-sm (12px → 14px)")
print("text-xs → text-base (12px → 16px)")
