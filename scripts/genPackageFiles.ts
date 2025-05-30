// import * as fs from 'node:fs';
// import * as path from 'node:path';
//
// fs.writeFileSync(path.resolve('dist/esm/package.json'), '{"type": "module"}', 'utf-8');
// fs.writeFileSync(path.resolve('dist/cjs/package.json'), '{"type": "commonjs"}', 'utf-8');

// import fs from 'fs/promises';
// import path from 'path';
//
// const ROOT = process.cwd();
// const DIST_DIR = path.join(process.cwd(), 'dist');
// const PKG_NAME = 'kr-observable';

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const PKG_NAME = 'kr-observable';

// Helper to write package.json stubs
async function writePackageJson(outputPath: string, moduleName: string) {
  // Default fields needed for ESM/CJS resolution
  const defaultPkg = {
    name: moduleName,
    type: 'module',
    module: './index.js',
    types: './index.d.ts',
    sideEffects: false,
  };

  let finalPkg = { ...defaultPkg };

  // Try to load existing package.json from source
  const srcPkgPath = path.join(ROOT, 'packages', 'preact', 'package.json');

  try {
    const srcPkgRaw = await fs.readFile(srcPkgPath, 'utf-8');
    const srcPkg = JSON.parse(srcPkgRaw);

    // Merge with defaults — keep user-defined fields like dependencies
    finalPkg = {
      ...defaultPkg,
      ...srcPkg,
    };
  } catch {
    console.warn(`⚠️ Could not read source package.json at ${srcPkgPath}. Using defaults.`);
  }

  // Write merged package.json to dist folder
  const targetPkgPath = path.join(outputPath, 'package.json');
  await fs.writeFile(targetPkgPath, JSON.stringify(finalPkg, null, 2), 'utf-8');
  // console.log(`✅ Wrote package.json to ${targetPkgPath}`);
}

async function generateMainPackage() {
  const targets = [
    { dir: 'esm', moduleType: 'module' },
    { dir: 'cjs', moduleType: 'commonjs' },
  ];

  for await (const target of targets) {
    const outDir = path.join(DIST_DIR, target.dir);
    const indexFile = path.join(outDir, 'index.js');

    // Ensure the folder exists
    await fs.mkdir(outDir, { recursive: true });

    // Write the correct export
    await fs.writeFile(indexFile, `export * from './main/index.js';`, 'utf-8');

    // Write package.json
    await writePackageJson(outDir, PKG_NAME);
  }
}

async function generateSubpackage() {
  const targets = [
    { dir: 'esm/preact', moduleType: 'module' },
    { dir: 'cjs/preact', moduleType: 'commonjs' },
  ];

  for await (const target of targets) {
    const outDir = path.join(DIST_DIR, target.dir);
    // const indexFile = path.join(outDir, 'index.js');

    // Ensure the folder exists
    await fs.mkdir(outDir, { recursive: true });

    // Write the correct export
    // await fs.writeFile(indexFile, `export * from '../preact/index.js';`, 'utf-8');

    // Write package.json
    await writePackageJson(outDir, `${PKG_NAME}-preact`);
  }
}

async function main() {
  try {
    await generateMainPackage();
    await generateSubpackage();

    // console.log('✅ Package files generated successfully.');
  } catch {
    // console.error('❌ Failed to generate package files:', err);
    process.exit(1);
  }
}

main();

// async function writePackageJson(outputPath: string, moduleName: string) {
//   const content = {
//     name: moduleName,
//     type: 'module',
//     main: `${outputPath.replace('dist/', '')}/index.js`,
//     module: `${outputPath.replace('dist/', '')}/index.js`,
//     types: `${outputPath.replace('dist/', '')}/index.d.ts`,
//     sideEffects: false
//   };
//   await fs.writeFile(path.join(outputPath, 'package.json'), JSON.stringify(content, null, 2), 'utf-8');
// }
//
// async function generateMainPackage() {
//   const targets = [
//     { dir: 'esm', moduleType: 'module' },
//     { dir: 'cjs', moduleType: 'commonjs' }
//   ];
//
//   for (const target of targets) {
//     const outDir = path.join(DIST_DIR, target.dir);
//     const indexFile = path.join(outDir, 'index.js');
//
//     await fs.mkdir(outDir, { recursive: true });
//     // await fs.writeFile(
//     //   indexFile,
//     //   `export * from '../packages/main/index.js';`,
//     //   'utf-8'
//     // );
//   }
//
//   // Generate dist/package.json with correct relative paths
//   const finalPkgPath = path.join(DIST_DIR, 'package.json');
//   const finalPkgContent = {
//     name: PKG_NAME,
//     type: 'module',
//     main: './cjs/index.js',
//     module: './esm/index.js',
//     types: './types/index.d.ts',
//     sideEffects: false
//   };
//
//   await fs.writeFile(finalPkgPath, JSON.stringify(finalPkgContent, null, 2), 'utf-8');
//   console.log(`✅ Generated ${finalPkgPath} with correct relative paths`);
// }
//
// async function generateSubpackage() {
//   const targets = [
//     { dir: 'esm/preact', moduleType: 'module' },
//     { dir: 'cjs/preact', moduleType: 'commonjs' }
//   ];
//
//   for (const target of targets) {
//     const outDir = path.join(DIST_DIR, target.dir);
//     const indexFile = path.join(outDir, 'index.js');
//
//     await fs.mkdir(outDir, { recursive: true });
//     await fs.writeFile(
//       indexFile,
//       `export * from '../../packages/preact/index.js';`,
//       'utf-8'
//     );
//
//     // Generate package.json with correct relative paths
//     const pkgJsonPath = path.join(outDir, 'package.json');
//     const isESM = target.dir.startsWith('esm');
//
//     const pkgContent = {
//       name: `${PKG_NAME}-preact`,
//       type: 'module',
//       [isESM ? 'module' : 'main']: './index.js',
//       types: './index.d.ts'
//     };
//
//     await fs.writeFile(pkgJsonPath, JSON.stringify(pkgContent, null, 2), 'utf-8');
//   }
//
//   console.log('✅ Generated subpackage package.json files with relative paths');
// }
//
// async function main() {
//   try {
//     await generateMainPackage();
//     await generateSubpackage();
//     console.log('✅ Package files generated successfully.');
//   } catch (err) {
//     console.error('❌ Failed to generate package files:', err);
//     process.exit(1);
//   }
// }
//
// main().catch();
