const fs = require('fs');
const path = require('path');
const root = process.cwd();
const replacements = [
  ['../../../../shared/lib/', '@/lib/'],
  ['../../../shared/lib/', '@/lib/'],
  ['../../../../shared/types/', '@/types/'],
  ['../../../shared/types/', '@/types/'],
  ['../../../../shared/', '@/'],
  ['../../../shared/', '@/'],
  ['../../../../services/tailoring/package', '@services/tailoring/package'],
  ['../../../services/tailoring/package', '@services/tailoring/package'],
];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(p);
      continue;
    }
    if (!p.endsWith('.ts')) continue;
    let content = fs.readFileSync(p, 'utf8');
    const original = content;
    for (const [from, to] of replacements) {
      content = content.split(from).join(to);
    }
    if (content !== original) {
      fs.writeFileSync(p, content, 'utf8');
      console.log('patched', path.relative(root, p));
    }
  }
}
walk(root);
