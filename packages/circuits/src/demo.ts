/**
 * Genera una prueba de ejemplo para probar el portal público.
 *
 *   npx ts-node src/demo.ts
 *
 * Escribe build/demo-proof.json. Ese archivo se pega en /verificar y tiene que
 * dar "válida"; si se le cambia un dígito, tiene que dar "no es válida".
 *
 * Los datos (src/demo-data.ts) son inventados, pero pasan por exactamente el
 * mismo camino que los reales: compromiso Poseidon, árbol, circuito y prueba.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { PAGOS, PRESUPUESTO, PROVEEDORES } from './demo-data';
import { cerrarProver, prove, verify, verificationKeyHash } from './prove';

const SALIDA = path.resolve(__dirname, '..', 'build', 'demo-proof.json');

async function main() {
  const total = PAGOS.reduce((a, p) => a + p.amountMinorUnits, 0n);
  console.log(`${PAGOS.length} pagos a ${new Set(PAGOS.map((p) => p.vendorId)).size} proveedores`);
  console.log(`Suman ${total / 100n} de un presupuesto de ${PRESUPUESTO / 100n}`);
  console.log('\nGenerando la prueba (tarda un rato)...');

  const inicio = Date.now();
  const bundle = await prove({
    payments: PAGOS,
    vendorIds: PROVEEDORES,
    budgetLimit: PRESUPUESTO,
  });
  console.log(`Lista en ${((Date.now() - inicio) / 1000).toFixed(1)}s`);

  const válida = await verify(bundle);
  if (!válida) throw new Error('la prueba recién generada no verifica: algo está mal');

  writeFileSync(SALIDA, JSON.stringify(bundle, null, 2));

  console.log('\nEscrita en', SALIDA);
  console.log('Huella de la clave de verificación:', verificationKeyHash());
  console.log('\nPegá ese archivo en /verificar. Lo que el verificador NO va a ver:');
  console.log('  ningún monto, ningún proveedor, ninguna fecha, ni cuántos pagos hubo.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  // Sin esto el proceso no sale nunca: snarkjs deja su pool de workers abierto.
  .finally(cerrarProver);
