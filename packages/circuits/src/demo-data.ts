/**
 * Los datos inventados de la prueba de ejemplo (build/demo-proof.json).
 *
 * Viven aparte de src/demo.ts para que las pruebas de aceptación los puedan
 * importar sin generar una prueba: la de privacidad necesita saber cuáles son
 * los secretos para buscarlos en todo lo que se publicó.
 *
 * Ojo con las sales: son patrones ('11' repetido, '22' repetido...) para que el
 * ejemplo sea reproducible. En producción la sal sale de gen_random_bytes(32)
 * en la base. Estas no protegen nada, y test/acceptance/privacy.test.ts lo usa
 * justamente como control: con estas sales el ataque de fuerza bruta funciona.
 */
import type { PaymentInput } from '../../contracts/src/commitment';

export function uuid(n: number): string {
  const hex = n.toString(16).padStart(32, '0');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)]
    .join('-');
}

export const PROVEEDORES = [uuid(1), uuid(2), uuid(3), uuid(4), uuid(5)];

// Un mes de una fundación: siete pagos a tres proveedores de su lista.
export const PAGOS: PaymentInput[] = [
  { paymentId: uuid(101), amountMinorUnits: 1_250_000_00n, vendorId: PROVEEDORES[0], paidOn: '2026-08-04', saltHex: '11'.repeat(32) },
  { paymentId: uuid(102), amountMinorUnits:   840_000_00n, vendorId: PROVEEDORES[1], paidOn: '2026-08-07', saltHex: '22'.repeat(32) },
  { paymentId: uuid(103), amountMinorUnits: 2_100_000_00n, vendorId: PROVEEDORES[0], paidOn: '2026-08-12', saltHex: '33'.repeat(32) },
  { paymentId: uuid(104), amountMinorUnits:   375_500_00n, vendorId: PROVEEDORES[2], paidOn: '2026-08-15', saltHex: '44'.repeat(32) },
  { paymentId: uuid(105), amountMinorUnits: 1_900_000_00n, vendorId: PROVEEDORES[1], paidOn: '2026-08-19', saltHex: '55'.repeat(32) },
  { paymentId: uuid(106), amountMinorUnits:   620_000_00n, vendorId: PROVEEDORES[2], paidOn: '2026-08-24', saltHex: '66'.repeat(32) },
  { paymentId: uuid(107), amountMinorUnits: 1_415_000_00n, vendorId: PROVEEDORES[0], paidOn: '2026-08-28', saltHex: '77'.repeat(32) },
];

export const PRESUPUESTO = 100_000_000_00n; // $100.000.000
