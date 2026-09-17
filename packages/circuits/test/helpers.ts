import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { PaymentInput } from '../../contracts/src/commitment';
import { WASM_PATH } from '../src/prove';

/* eslint-disable @typescript-eslint/no-var-requires */
const construirCalculadora = require('../build/authorized_within_budget_js/witness_calculator.js');

/**
 * Corre el circuito sobre unas entradas. Si alguna restricción no se cumple,
 * lanza: es la forma de comprobar que el circuito rechaza lo que tiene que
 * rechazar.
 */
export async function calcularTestigo(input: unknown): Promise<void> {
  const calculadora = await construirCalculadora(readFileSync(WASM_PATH));
  await calculadora.calculateWTNSBin(input, 0);
}

/** Espera que el circuito rechace estas entradas. */
export async function esperarRechazo(input: unknown, nombre: string): Promise<void> {
  try {
    await calcularTestigo(input);
  } catch {
    return;
  }
  throw new Error(`El circuito aceptó lo que debía rechazar: ${nombre}`);
}

/** UUID determinista, para que las pruebas no dependan del azar. */
export function uuid(n: number): string {
  const hex = n.toString(16).padStart(32, '0');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

export function pago(n: number, over: Partial<PaymentInput> = {}): PaymentInput {
  return {
    paymentId: uuid(1000 + n),
    amountMinorUnits: BigInt((n + 1) * 100_000),
    vendorId: uuid(1 + (n % 3)),
    paidOn: '2026-08-20',
    saltHex: (n + 1).toString(16).padStart(2, '0').repeat(32),
    ...over,
  };
}

export const PROVEEDORES = [uuid(1), uuid(2), uuid(3), uuid(4)];

export const BUILD = path.resolve(__dirname, '..', 'build');
