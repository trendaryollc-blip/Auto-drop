const fs = require('fs');
const path = require('path');

const outDir = 'dist';
const files = ['index.html', 'core.js', 'app.js', 'csp-bridge.js', 'runtime-module.js', 'sw.js'];
const dirs = ['css', 'plugins', 'data'];

fs.mkdirSync(outDir, { recursive: true });

files.forEach((f) => {
  if (fs.existsSync(f)) fs.copyFileSync(f, path.join(outDir, f));
});

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  fs.readdirSync(src, { withFileTypes: true }).forEach((entry) => {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

dirs.forEach((d) => {
  if (fs.existsSync(d)) copyDir(d, path.join(outDir, d));
});

// Generate env-config.js from .env
try {
  require('./build-env.cjs');
} catch (e) {
  console.warn('env-config generation skipped:', e.message);
}

// Copy env-config.js to dist if it was generated
if (fs.existsSync('env-config.js')) {
  fs.copyFileSync('env-config.js', path.join(outDir, 'env-config.js'));
  console.log('env-config.js included in dist/');
}

console.log('Build complete: dist/');
