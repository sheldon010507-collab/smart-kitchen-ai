/**
 * 將桌麵 01-hook 資料夾的圖片複製到 public/footage/01-hook/ 並重命名為 01.jpg～10.jpg
 * 在 video-demo 目錄下執行: node scripts/copy-hook-images.js
 */
const fs = require('fs');
const path = require('path');

const srcDir = path.join(process.env.USERPROFILE || '', 'Desktop', 'toB視頻', '01-hook');
const dstDir = path.join(__dirname, '..', 'public', 'footage', '01-hook');

if (!fs.existsSync(srcDir)) {
  console.error('源目錄不存在:', srcDir);
  console.error('請確認路徑：C:\\Users\\你的用戶名\\Desktop\\toB視頻\\01-hook');
  process.exit(1);
}

if (!fs.existsSync(dstDir)) fs.mkdirSync(dstDir, { recursive: true });

const files = fs.readdirSync(srcDir).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));
if (files.length === 0) {
  console.error('未找到圖片文件');
  process.exit(1);
}

files.slice(0, 20).forEach((file, i) => {
  const src = path.join(srcDir, file);
  const dst = path.join(dstDir, `${String(i + 1).padStart(2, '0')}.jpg`);
  fs.copyFileSync(src, dst);
  console.log('已複製:', file, '->', path.basename(dst));
});

console.log('共複製', Math.min(files.length, 20), '張。可在 01-HookScene.tsx 中調整 HOOK_IMAGES 數量。');
