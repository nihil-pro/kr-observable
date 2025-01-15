import * as fs from 'node:fs';
import * as path from 'node:path';

import * as esbuild from 'esbuild';
import { BuildOptions, BuildResult } from 'esbuild';
import { makeBadge } from 'badge-maker';
import { pluginCompress } from '@espcom/esbuild-plugin-compress';

const pkg = JSON.parse(fs.readFileSync(path.resolve('./package.json'), 'utf8'));
const assetsPath = path.resolve('assets');

if (!fs.existsSync(assetsPath)) fs.mkdirSync(assetsPath);

function bytesForHuman(bytes: number, decimals = 2) {
  const units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB'];

  let i = 0;

  // eslint-disable-next-line no-param-reassign,@typescript-eslint/no-magic-numbers
  for (i; bytes > 1024; i++) bytes /= 1024;

  return `${parseFloat(bytes.toFixed(decimals))} ${units[i]}`;
}

function afterBuild(result: BuildResult, type: 'esm' | 'cjs') {
  const sizes: Record<string, string> = {};

  result.outputFiles.forEach((file) => {
    const ext = path.parse(file.path).ext.replace('.', '');

    sizes[ext] = bytesForHuman(fs.statSync(file.path).size);
  });

  const svgPath = path.resolve(assetsPath, `${type}.svg`);

  // eslint-disable-next-line no-console
  console.log(`Size ${type} ${sizes.js}`);

  const svg = makeBadge({
    label: type.toUpperCase(), // ,`Size (${type})`,
    message: `Minified + Gzipped: ${sizes.gz}`, // `min: ${sizes.js}; gz: ${sizes.gz} br: ${sizes.br}`,
    color: 'blue',
  });

  fs.writeFileSync(path.resolve(svgPath), svg, 'utf-8');

  fs.rmSync(path.resolve(assetsPath, type), { recursive: true, force: true });
}

const buildConfig: BuildOptions = {
  bundle: true,
  write: false,
  minify: true,
  metafile: true,
  sourcemap: false,
  target: 'es2022',
  packages: 'external',
  plugins: [
    pluginCompress({
      gzip: true,
      zstd: false,
      brotli: false,
      level: 'high',
      extensions: ['.js'],
    }),
  ],
};

await Promise.all([
  esbuild
    .build({
      ...buildConfig,
      entryPoints: [path.resolve(pkg.exports.import)],
      format: 'esm',
      outdir: 'assets/esm',
    })
    .then((res) => afterBuild(res, 'esm')),
  esbuild
    .build({
      ...buildConfig,
      entryPoints: [path.resolve(pkg.exports.require)],
      format: 'cjs',
      outdir: 'assets/cjs',
    })
    .then((res) => afterBuild(res, 'cjs')),
]);
