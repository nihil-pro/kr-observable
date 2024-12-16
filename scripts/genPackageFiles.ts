import * as fs from 'node:fs';
import * as path from 'node:path';

fs.writeFileSync(path.resolve('dist/esm/package.json'), '{"type": "module"}', 'utf-8');
fs.writeFileSync(path.resolve('dist/cjs/package.json'), '{"type": "commonjs"}', 'utf-8');
