#!/usr/bin/env node
/**
 * Monta o .dmg gerado pelo build:mac, copia o app para /Applications,
 * remove o atributo de quarentena (Gatekeeper) e desmonta o volume.
 *
 * Uso: npm run build:mac:noquarantine
 */
const { execSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const DIST = path.join(__dirname, '..', 'dist')
const APP_DIR = '/Applications'
const CERT_NAME = 'Money Local Developer'
const KEYCHAIN = path.join(os.homedir(), 'Library/Keychains/login.keychain-db')

function sh(cmd) {
  console.log(`> ${cmd}`)
  return execSync(cmd, { encoding: 'utf8' }).toString().trim()
}

function findDmg() {
  if (!fs.existsSync(DIST)) return null
  const files = fs
    .readdirSync(DIST)
    .filter((f) => f.endsWith('.dmg') && !f.endsWith('.blockmap'))
  return files.sort().pop() || null
}

/** Cria (se necessário) o certificado de assinatura de código auto-assinado. */
function ensureCert() {
  const existing = sh(
    `security find-identity -v -p codesigning 2>/dev/null | grep -c "${CERT_NAME}"`
  )
  if (existing.trim() !== '0') {
    console.log(`Certificado "${CERT_NAME}" já existe.`)
    return CERT_NAME
  }
  console.log(`Criando certificado "${CERT_NAME}"...`)
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'money-cert-'))
  const key = path.join(tmp, 'key.pem')
  const cert = path.join(tmp, 'cert.pem')
  const p12 = path.join(tmp, 'cert.p12')
  const pass = 'money123'
  try {
    sh(
      `openssl req -x509 -newkey rsa:2048 -sha256 -keyout "${key}" -out "${cert}" ` +
        `-days 3650 -nodes -subj "/CN=${CERT_NAME}" ` +
        `-addext "extendedKeyUsage=codeSigning" ` +
        `-addext "keyUsage=critical,digitalSignature"`
    )
    sh(
      `openssl pkcs12 -export -out "${p12}" -inkey "${key}" -in "${cert}" -passout pass:${pass}`
    )
    sh(`security import "${p12}" -k "${KEYCHAIN}" -P ${pass} -T /usr/bin/codesign`)
    sh(`security add-trusted-cert -r trustRoot -k "${KEYCHAIN}" "${cert}"`)
    console.log(`Certificado "${CERT_NAME}" criado e importado.`)
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
  return CERT_NAME
}

/** Copia o .app para um destino, assina com o certificado e remove a quarentena. */
function installAndClear(srcApp, appName, baseDir, identity) {
  const dstApp = path.join(baseDir, appName)
  // ditto preserva a estrutura/metadados do bundle.
  sh(`ditto "${srcApp}" "${dstApp}"`)
  // Assina o bundle inteiro com o certificado (evita o bloqueio do XProtect).
  sh(`codesign --force --deep --sign "${identity}" "${dstApp}"`)
  // Remove a quarentena (Gatekeeper).
  sh(`xattr -dr com.apple.quarantine "${dstApp}"`)
  return dstApp
}

try {
  const dmg = findDmg()
  if (!dmg) {
    console.error('Nenhum .dmg encontrado em dist/.')
    process.exit(1)
  }
  const dmgPath = path.join(DIST, dmg)
  console.log(`DMG: ${dmgPath}`)

  const identity = ensureCert()

  // Monta o volume (read-only) e descobre o ponto de montagem.
  const attach = sh(`hdiutil attach "${dmgPath}" -nobrowse -readonly`)
  const volLine = attach
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.includes('/Volumes/'))
  if (!volLine) {
    console.error('Não foi possível montar o DMG.')
    process.exit(1)
  }
  const vol = volLine.split('\t').pop().trim()

  try {
    const apps = fs.readdirSync(vol).filter((f) => f.endsWith('.app'))
    if (!apps.length) {
      console.error(`Nenhum .app encontrado no volume ${vol}.`)
      process.exit(1)
    }
    const appName = apps[0]
    const srcApp = path.join(vol, appName)

    let dstApp
    try {
      // Tenta instalar em /Applications.
      dstApp = installAndClear(srcApp, appName, APP_DIR, identity)
      console.log(`\n✔ Instalado: ${dstApp}`)
    } catch (err) {
      console.warn(
        `\nNão foi possível copiar para ${APP_DIR} (permissão).`
      )
      console.warn(`  → ${err.message.split('\n')[0]}`)
      // Fallback: instala em ~/Applications (cria se necessário).
      const userApps = path.join(os.homedir(), 'Applications')
      if (!fs.existsSync(userApps)) fs.mkdirSync(userApps, { recursive: true })
      dstApp = installAndClear(srcApp, appName, userApps, identity)
      console.log(`\n✔ Instalado em: ${dstApp}`)
    }

    console.log('Quarentena removida. Já pode abrir sem o aviso do macOS.')
  } finally {
    // Garante a desmontagem mesmo em caso de erro.
    try {
      sh(`hdiutil detach "${vol}"`)
    } catch (_) {
      /* volume já desmontado */
    }
  }
} catch (err) {
  console.error('\nErro:', err.message)
  process.exit(1)
}
