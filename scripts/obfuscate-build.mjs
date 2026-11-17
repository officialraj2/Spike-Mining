import fs from 'fs';
import path from 'path';
import JavaScriptObfuscator from 'javascript-obfuscator';

const distAssetsDir = path.resolve(process.cwd(), 'dist', 'assets');

if (!fs.existsSync(distAssetsDir)) {
  console.warn('[Obfuscator] dist/assets directory not found; skipping.');
  process.exit(0);
}

const files = fs.readdirSync(distAssetsDir).filter((f) => f.endsWith('.js'));

let obfuscatedCount = 0;
for (const file of files) {
  // Keep large third-party vendor bundles and rolldown runtime helpers untouched for speed and stability
  if (file.startsWith('vendor-') || file.startsWith('rolldown-runtime-')) {
    continue;
  }

  const fullPath = path.join(distAssetsDir, file);
  const code = fs.readFileSync(fullPath, 'utf8');

  const result = JavaScriptObfuscator.obfuscate(code, {
    compact: true,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    debugProtection: false,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    numbersToExpressions: true,
    renameGlobals: false,
    selfDefending: false,
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 8,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayEncoding: ['base64'],
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayWrappersCount: 2,
    stringArrayWrappersType: 'function',
    transformObjectKeys: false,
    unicodeEscapeSequence: false,
  });

  fs.writeFileSync(fullPath, result.getObfuscatedCode(), 'utf8');
  obfuscatedCount++;
}

console.log(`[Obfuscator] Protected ${obfuscatedCount} production application JS bundles in dist/assets.`);
