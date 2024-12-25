import * as fs from 'node:fs';
import * as path from 'node:path';

// @ts-ignore
import XMLSplitter from 'xml-splitter';
import { makeBadge } from 'badge-maker';

function processReport(xml: Record<string, any>, computation: any) {
  if (xml.packages.package instanceof Array) {
    xml.packages.package.forEach((packageObject: any) => {
      processPackage(packageObject, computation);
    });
  } else {
    processPackage(xml.packages.package, computation);
  }
}

function processPackage(packageObject: any, computation: any) {
  if (packageObject.classes.class instanceof Array) {
    packageObject.classes.class.forEach((clazz: any) => {
      processClass(clazz, computation);
    });
  } else {
    processClass(packageObject.classes.class, computation);
  }
}

function processClass(clazz: any, computation: any) {
  if (!clazz.methods.method) return;

  if (clazz.methods.method instanceof Array) {
    clazz.methods.method.forEach((method: any) => {
      computation.total += 1;

      computation.passed =
        // eslint-disable-next-line no-plusplus
        parseInt(method.hits, 10) > 0 ? ++computation.passed : computation.passed;
    });
  } else {
    computation.total += 1;
    computation.passed =
      // eslint-disable-next-line no-plusplus
      parseInt(clazz.methods.method.hits, 10) > 0 ? ++computation.passed : computation.passed;
  }
}

function parseIstanbulReport(reportFilePath: string): Promise<{
  overallPercent: number;
  functionRate: number;
  lineRate: number;
  branchRate: number;
}> {
  return new Promise((resolve, reject) => {
    new XMLSplitter('/coverage')
      .on('data', (xml: Record<string, any>) => {
        const methods = {
          total: 0,
          passed: 0,
        };

        processReport(xml, methods);

        const functionRate = parseFloat(String(methods.passed / methods.total));
        const lineRate = parseFloat(xml['line-rate']);
        const branchRate = parseFloat(xml['branch-rate']);

        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        const overallPercent = Math.floor(((functionRate + lineRate + branchRate) / 3) * 100);

        resolve({
          overallPercent,
          functionRate,
          lineRate,
          branchRate,
        });
      })
      .on('error', (error: Error) =>
        reject(
          Object.assign(
            new Error(`Error parsing the given istanbul report (${reportFilePath}): `),
            {
              stack: error.stack,
            }
          )
        )
      )
      .parseString(fs.readFileSync(reportFilePath, 'utf-8'));
  });
}

const result = await parseIstanbulReport(path.resolve('./.nyc_output/cobertura-coverage.xml'));

const svg = makeBadge({
  label: `Coverage`,
  message: `${String(result.overallPercent)}%`,
  color: 'brightgreen',
});

const assetsPath = path.resolve('assets');
const svgPath = path.resolve(assetsPath, `coverage.svg`);

if (!fs.existsSync(assetsPath)) fs.mkdirSync(assetsPath);

fs.writeFileSync(path.resolve(svgPath), svg, 'utf-8');
