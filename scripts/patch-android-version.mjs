import { readFile, writeFile } from 'node:fs/promises';

const path = 'android/app/build.gradle';
let s = await readFile(path, 'utf8');

const runNumber = Number(String(process.env.GITHUB_RUN_NUMBER || '').trim());
const hasRunNumber = Number.isInteger(runNumber) && runNumber > 0;
const defaultCode = hasRunNumber ? 612000 + runNumber : 612000;
const defaultName = hasRunNumber ? `61.2.${runNumber}` : '61.2.0';

const rawCode = String(process.env.FEP_VERSION_CODE || defaultCode).trim();
const versionCode = Number(rawCode);
const versionName = String(process.env.FEP_VERSION_NAME || defaultName).trim();

if (!Number.isInteger(versionCode) || versionCode < 2 || versionCode > 2100000000) {
  throw new Error(`Invalid FEP_VERSION_CODE: ${rawCode}`);
}
if (!/^\d+\.\d+(?:\.\d+){0,2}$/.test(versionName)) {
  throw new Error(`Invalid FEP_VERSION_NAME: ${versionName}`);
}

const codeMatches = [...s.matchAll(/\bversionCode\s+\d+/g)];
const nameMatches = [...s.matchAll(/\bversionName\s+["'][^"']+["']/g)];
if (codeMatches.length !== 1) throw new Error(`Expected exactly one versionCode, found ${codeMatches.length}`);
if (nameMatches.length !== 1) throw new Error(`Expected exactly one versionName, found ${nameMatches.length}`);

s = s.replace(/\bversionCode\s+\d+/, `versionCode ${versionCode}`);
s = s.replace(/\bversionName\s+["'][^"']+["']/, `versionName "${versionName}"`);

if (!s.includes(`versionCode ${versionCode}`) || !s.includes(`versionName "${versionName}"`)) {
  throw new Error('Android version patch verification failed');
}

await writeFile(path, s, 'utf8');
console.log(`Android release version set: versionCode=${versionCode}, versionName=${versionName}`);
