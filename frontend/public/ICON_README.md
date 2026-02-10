# PWA 图标说明

## 当前状态

manifest.json 已配置为优先使用 PNG 图标，以获得最佳的浏览器兼容性。

## 需要的图标文件

请在 `frontend/public/` 目录下添加以下 PNG 图标文件：

- `icon-192.png` - 192x192 像素
- `icon-512.png` - 512x512 像素

## 生成 PNG 图标的方法

### 方法1：在线工具

推荐使用以下在线工具从 SVG 生成 PNG：

1. **PWA Asset Generator** - https://www.pwabuilder.com/imageGenerator
   - 上传 `vite.svg`
   - 下载生成的图标包
   - 将 `icon-192.png` 和 `icon-512.png` 复制到 `public/` 目录

2. **Favicon Generator** - https://realfavicongenerator.net/
   - 上传 SVG 文件
   - 下载生成的图标包
   - 选择合适尺寸的 PNG 文件

### 方法2：命令行工具（ImageMagick）

```bash
# 安装 ImageMagick
brew install imagemagick  # macOS
apt-get install imagemagick  # Ubuntu

# 转换 SVG 到 PNG
cd frontend/public
convert -background none vite.svg -resize 192x192 icon-192.png
convert -background none vite.svg -resize 512x512 icon-512.png
```

### 方法3：Node.js 工具（sharp）

```bash
cd frontend
npm install --save-dev sharp

# 创建转换脚本
cat > scripts/generate-icons.js << 'EOF'
const sharp = require('sharp');
const fs = require('fs');

async function generateIcons() {
  await sharp('public/vite.svg')
    .resize(192, 192)
    .png()
    .toFile('public/icon-192.png');

  await sharp('public/vite.svg')
    .resize(512, 512)
    .png()
    .toFile('public/icon-512.png');

  console.log('✅ 图标生成完成！');
}

generateIcons().catch(console.error);
EOF

# 运行脚本
node scripts/generate-icons.js
```

## 验证图标

添加图标文件后，可以通过以下方式验证：

1. **Chrome DevTools**:
   - 打开 Application > Manifest
   - 检查图标是否正确加载

2. **Lighthouse**:
   ```bash
   npm run build
   npx lighthouse http://localhost:3000 --view
   ```
   查看 PWA 安装图标得分

3. **真实设备测试**:
   - Android Chrome: 应显示原生安装提示
   - iOS Safari: 分享按钮应显示"添加到主屏幕"选项

## 图标设计建议

- **简洁明了**: 避免过多细节，小尺寸下仍清晰可辨
- **品牌色**: 使用主题色 #1890ff
- **透明背景**: 使用 PNG 透明背景，适配不同主题
- **安全区**: 重要内容居中，留出 10% 边距

## 临时方案

在添加 PNG 图标之前，应用仍可使用 SVG 图标正常工作。
现代浏览器（Chrome 85+, Edge 85+, Firefox 90+）已支持 SVG 作为 PWA 图标。
