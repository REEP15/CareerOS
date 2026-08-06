const fs = require('fs');
const path = require('path');

const dist = path.resolve(__dirname, '..', 'dist');
const nested = path.join(dist, 'worker');

function moveDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
      moveDir(srcPath, destPath);
    } else {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.renameSync(srcPath, destPath);
    }
  }
}

try {
  if (fs.existsSync(nested)) {
    moveDir(nested, dist);
    // remove nested dir
    const rimraf = (dir) => {
      if (!fs.existsSync(dir)) return;
      for (const f of fs.readdirSync(dir)) {
        const cur = path.join(dir, f);
        if (fs.lstatSync(cur).isDirectory()) rimraf(cur); else fs.unlinkSync(cur);
      }
      fs.rmdirSync(dir);
    };
    rimraf(nested);
  }
} catch (err) {
  console.error('fix-dist-structure failed', err);
  process.exit(1);
}
