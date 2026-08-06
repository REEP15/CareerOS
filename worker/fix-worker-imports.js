const fs = require('fs');
const path = require('path');
const root = process.cwd();
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
    content = content.replace(/from\s+(['"])(\.\.\/){3}shared\//g, 'from $1../../../../shared/');
    content = content.replace(/from\s+(['"])(\.\.\/){3}services\/tailoring\/package\1/g, 'from $1../../../services/tailoring/package$1');
    content = content.replace(/import type \{ Application, ApplicationStatus \} from \"\.\.\/\.\.\/\.\/shared\/types\/application\";/g, 'import { ApplicationStatus } from "../../../../shared/types/application";\nimport type { Application } from "../../../../shared/types/application";');
    if (content !== original) {
      fs.writeFileSync(p, content, 'utf8');
      console.log('patched', path.relative(root, p));
    }
  }
}
walk(root);
