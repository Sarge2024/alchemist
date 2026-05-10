import fs from 'fs';
import path from 'path';

const packageJsonPath = path.resolve(process.cwd(), 'package.json');
const constantsPath = path.resolve(process.cwd(), 'src/constants.ts');

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = pkg.version;

// Expressão regular para analisar a versão atual (ex: 2.1.0, 2.1.0a, 2.1.0z)
const match = currentVersion.match(/^(\d+\.\d+\.)(\d+)([a-z])?$/);

if (!match) {
  console.error("Formato de versão inválido. Esperado x.y.z ou x.y.za");
  process.exit(1);
}

const prefix = match[1]; // "2.1."
let patch = parseInt(match[2], 10); // 0
let letter = match[3]; // "a" ou undefined

if (!letter) {
  // Se for "2.1.0", passa para "2.1.0a"
  letter = 'a';
} else if (letter === 'z') {
  // Se for "2.1.0z", passa para "2.1.1a"
  patch++;
  letter = 'a';
} else {
  // Incrementa a letra do alfabeto
  letter = String.fromCharCode(letter.charCodeAt(0) + 1);
}

const newVersion = `${prefix}${patch}${letter}`;

// Atualizar package.json
pkg.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');

// Atualizar constants.ts
if (fs.existsSync(constantsPath)) {
  let constantsContent = fs.readFileSync(constantsPath, 'utf8');
  constantsContent = constantsContent.replace(
    /export const APP_VERSION = '.*';/,
    `export const APP_VERSION = '${newVersion}';`
  );
  
  // Atualizar data de build
  const today = new Date().toISOString().split('T')[0];
  constantsContent = constantsContent.replace(
    /export const APP_BUILD_DATE = '.*';/,
    `export const APP_BUILD_DATE = '${today}';`
  );

  fs.writeFileSync(constantsPath, constantsContent);
}

console.log(`[Alquimia do Prato] Sincronismo concluído! Versão atualizada: ${currentVersion} -> ${newVersion}`);
