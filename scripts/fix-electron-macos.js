/**
 * fix-electron-macos.js
 *
 * Corrige o falso positivo do XProtect/Gatekeeper do macOS contra o binário
 * do Electron (erro "no CMS blob" / "malware moved to trash").
 *
 * O problema: quando o `electron` é instalado via npm, o macOS pode deletar o
 * `Electron Framework.framework` (binário principal) porque ele vem sem uma
 * assinatura de código válida. Isso deixa o app incompleto e ele não abre.
 *
 * Solução: re-baixar o zip completo, re-assinar tudo ad-hoc (o que muda a
 * assinatura e impede o XProtect de reconhecer a "ameaça") e copiar para o
 * `node_modules/electron/dist`.
 *
 * Só roda no macOS. Nos demais sistemas não faz nada.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Só é necessário no macOS
if (process.platform !== 'darwin') {
  console.log('[fix-electron-macos] Sistema não é macOS. Nada a fazer.');
  process.exit(0);
}

const root = path.join(__dirname, '..');
const electronDir = path.join(root, 'node_modules', 'electron');
const distDir = path.join(electronDir, 'dist');
const appPath = path.join(distDir, 'Electron.app');
const frameworksDir = path.join(appPath, 'Contents', 'Frameworks');

function appIsComplete() {
  try {
    return (
      fs.existsSync(frameworksDir) &&
      fs.readdirSync(frameworksDir).length > 0
    );
  } catch {
    return false;
  }
}

/**
 * Garante o `node_modules/electron/path.txt`, que o pacote `electron` usa para
 * localizar o binário. Sem ele o electron-vite falha com "Electron uninstall".
 */
function ensurePathFile() {
  const pathFile = path.join(electronDir, 'path.txt');
  const expected = 'Electron.app/Contents/MacOS/Electron';
  let current = '';
  try {
    current = fs.readFileSync(pathFile, 'utf-8').trim();
  } catch {
    current = '';
  }
  if (current !== expected) {
    fs.writeFileSync(pathFile, expected);
    console.log('[fix-electron-macos] path.txt recriado.');
  }
}

function signAdHoc(target) {
  execSync(`codesign --force --deep --sign - "${target}"`, { stdio: 'inherit' });
}

(async () => {
  const pkg = require(path.join(electronDir, 'package.json'));

  console.log('[fix-electron-macos] Verificando Electron.app...');

  if (appIsComplete()) {
    console.log('[fix-electron-macos] Electron completo. Re-assinando ad-hoc...');
    signAdHoc(appPath);
    ensurePathFile();
    console.log('[fix-electron-macos] OK. Electron pronto.');
    process.exit(0);
  }

  console.log(
    '[fix-electron-macos] Electron incompleto (XProtect deletou o framework). Re-baixando...'
  );

  const { downloadArtifact } = require('@electron/get');

  const zipPath = await downloadArtifact({
    version: pkg.version,
    artifactName: 'electron',
    platform: 'darwin',
    arch: process.arch,
  });

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'electron-fresh-'));
  // Usa `unzip` (comando do macOS) em vez de extract-zip: o extract-zip trava
  // nesta máquina e produz extrações incompletas.
  console.log('[fix-electron-macos] Extraindo com unzip...');
  execSync(`unzip -q "${zipPath}" -d "${tmpDir}"`, { stdio: 'inherit' });

  const freshApp = path.join(tmpDir, 'Electron.app');
  console.log('[fix-electron-macos] Extraído. Re-assinando ad-hoc...');
  signAdHoc(freshApp);

  // Substitui o app quebrado pela versão completa e assinada
  fs.rmSync(appPath, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });
  execSync(`cp -R "${freshApp}" "${distDir}"`);

  fs.rmSync(tmpDir, { recursive: true, force: true });
  ensurePathFile();
  console.log('[fix-electron-macos] Electron reinstalado e assinado. OK.');
  process.exit(0);
})().catch((err) => {
  console.error('[fix-electron-macos] Erro:', err.message || err);
  process.exit(1);
});
