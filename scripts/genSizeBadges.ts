import * as fs from 'node:fs';
import * as path from 'node:path';

import * as esbuild from 'esbuild';
import { BuildOptions, BuildResult } from 'esbuild';
import { makeBadge } from 'badge-maker';

const pkg = JSON.parse(fs.readFileSync(path.resolve('./package.json'), 'utf8'));

function bytesForHuman(bytes: number, decimals = 2) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

  let i = 0;

  // eslint-disable-next-line no-param-reassign,@typescript-eslint/no-magic-numbers
  for (i; bytes > 1024; i++) bytes /= 1024;

  return `${parseFloat(bytes.toFixed(decimals))} ${units[i]}`;
}

function afterBuild(result: BuildResult, type: 'esm' | 'cjs') {
  const size = bytesForHuman(result.metafile!.outputs['index.js'].bytes);

  const assetsPath = path.resolve('assets');
  const svgPath = path.resolve(assetsPath, `${type}.svg`);

  if (!fs.existsSync(assetsPath)) fs.mkdirSync(assetsPath);

  const prevSvg = fs.existsSync(svgPath) ? fs.readFileSync(svgPath, 'utf-8') : null;

  if (prevSvg) {
    const match = prevSvg.match(/>(\d+\.?\d+?\s\w+)</);
    const prevSize = match?.[1];

    if (size === prevSize) {
      // eslint-disable-next-line no-console
      console.log(`(unchanged) Size ${type} ${prevSize}`);

      return;
    }

    // eslint-disable-next-line no-console
    console.log(`(changed) Size ${type} changed from ${prevSize} to ${size}`);
  } else {
    // eslint-disable-next-line no-console
    console.log(`(new) Size ${type} ${size}`);
  }

  const svg = makeBadge({
    label: `Size (minified ${type})`,
    message: size,
    color: 'blue',
  });

  fs.writeFileSync(path.resolve(svgPath), svg, 'utf-8');
}

const buildConfig: BuildOptions = {
  bundle: true,
  write: false,
  minify: true,
  metafile: true,
  sourcemap: false,
  target: 'node18',
  packages: 'external',
};

await Promise.all([
  esbuild
    .build({
      ...buildConfig,
      entryPoints: [path.resolve(pkg.exports.import)],
      format: 'esm',
    })
    .then((res) => afterBuild(res, 'esm')),
  esbuild
    .build({
      ...buildConfig,
      entryPoints: [path.resolve(pkg.exports.require)],
      format: 'cjs',
    })
    .then((res) => afterBuild(res, 'cjs')),
]);
