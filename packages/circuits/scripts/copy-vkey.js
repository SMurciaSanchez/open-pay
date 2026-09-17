// Copia la clave de verificación al portal público.
// Es el único artefacto de la ceremonia que se publica: con ella se verifica,
// no se prueba. La clave de prueba (.zkey) pesa cientos de megas y no se sube.
const fs = require('node:fs');
const path = require('node:path');

const origen = path.resolve(__dirname, '..', 'build', 'verification_key.json');
const destino = path.resolve(__dirname, '..', '..', 'web', 'public', 'zk', 'verification_key.json');

if (!fs.existsSync(origen)) {
  console.error(`No existe ${origen}. Generala con: npm run build`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.copyFileSync(origen, destino);
console.log(`Copiada a ${destino}`);
