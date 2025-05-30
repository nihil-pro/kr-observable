import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');
const PKG_DIR = path.join(ROOT, 'packages', 'main');

async function migrate() {
  try {
    // Check if src exists
    await fs.access(SRC_DIR);
    // console.log('✅ Found src/ folder');

    // Create packages/mainpackage/
    await fs.mkdir(path.join(ROOT, 'packages'), { recursive: true });
    await fs.rename(SRC_DIR, PKG_DIR);

    // console.log('✅ Moved src/ → packages/main/');

    // Optional: create subpackage stub
    const subpackageDir = path.join(ROOT, 'packages', 'preact');
    await fs.mkdir(subpackageDir, { recursive: true });
    await fs.writeFile(
      path.join(subpackageDir, 'index.ts'),
      '// Subpackage code goes here\n',
      'utf-8'
    );
    await fs.writeFile(
      path.join(subpackageDir, 'package.json'),
      JSON.stringify(
        {
          name: 'kr-observable/preact',
          version: '2.0.17',
          main: '../dist/esm/preact/index.js',
          types: '../dist/types/preact/index.d.ts',
        },
        null,
        2
      ),
      'utf-8'
    );

    // console.log('✅ Created empty packages/preact/');
  } catch {
    // console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate().catch(console.error);
