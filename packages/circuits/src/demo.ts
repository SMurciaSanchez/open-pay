/**
 * Genera una prueba de ejemplo para probar el portal público.
 *
 *   npx ts-node src/demo.ts
 *
 * Escribe build/demo-proof.json. Ese archivo se pega en /verificar y tiene que
 * dar "válida"; si se le cambia un dígito, tiene que dar "no es válida".
 *
 * Los datos son inventados, pero pasan por exactamente el mismo camino que los
 * reales: compromiso Poseidon, árbol, circuito y prueba.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import type { PaymentInput } from '../../contracts/src/commitment';
import { prove, verify, verificationKeyHash } from './prove';

const SALIDA = path.resolve(__dirname, '..', 'build', 'demo-proof.json');

function uuid(n: number): string {
  const hex = n.toString(16).padStart(32, '0');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)]
    .join('-');
}

const PROVEEDORES = [uuid(1), uuid(2), uuid(3), uuid(4), uuid(5)];

// Un mes de una fundación: siete pagos a tres proveedores de su lista.
const PAGOS: PaymentInput[] = [
  { paymentId: uuid(101), amountMinorUnits: 1_250_000_00n, vendorId: PROVEEDORES[0], paidOn: '2026-08-04', saltHex: '11'.repeat(32) },
  { paymentId: uuid(102), amountMinorUnits:   840_000_00n, vendorId: PROVEEDORES[1], paidOn: '2026-08-07', saltHex: '22'.repeat(32) },
  { paymentId: uuid(103), amountMinorUnits: 2_100_000_00n, vendorId: PROVEEDORES[0], paidOn: '2026-08-12', saltHex: '33'.repeat(32) },
  { paymentId: uuid(104), amountMinorUnits:   375_500_00n, vendorId: PROVEEDORES[2], paidOn: '2026-08-15', saltHex: '44'.repeat(32) },
  { paymentId: uuid(105), amountMinorUnits: 1_900_000_00n, vendorId: PROVEEDORES[1], paidOn: '2026-08-19', saltHex: '55'.repeat(32) },
  { paymentId: uuid(106), amountMinorUnits:   620_000_00n, vendorId: PROVEEDORES[2], paidOn: '2026-08-24', saltHex: '66'.repeat(32) },
  { paymentId: uuid(107), amountMinorUnits: 1_415_000_00n, vendorId: PROVEEDORES[0], paidOn: '2026-08-28', saltHex: '77'.repeat(32) },
];

const PRESUPUESTO = 100_000_000_00n; // $100.000.000

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

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
