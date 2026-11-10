/**
 * Cifrado de datos bancarios (N3): el número de cuenta de la organización y la
 * glosa de cada movimiento.
 *
 * Solo servidor. Formato bank-v2:
 *  - AES-256-GCM, nonce(12) || cifrado || etiqueta(16).
 *  - La llave no es la maestra (BANK_DATA_KEY) sino una derivada de ella para
 *    cada organización (HKDF-SHA256). Así ninguna organización gasta el cupo de
 *    nonces de otra, y lo de una no se abre con la llave de otra.
 *  - El dato asociado lleva la organización y el campo: un cifrado copiado a
 *    otra organización, o movido de la glosa al número de cuenta, no descifra.
 *
 * bank-v1 (anterior al 2026-11-10) usaba la llave maestra directa y solo la
 * organización como dato asociado. Se sigue pudiendo leer; ya no se escribe.
 */
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'crypto';

export const BANK_KEY_ID = 'bank-v2';

export type BankField = 'account-number' | 'movement-description';

export const BANK_FIELDS: readonly BankField[] = ['account-number', 'movement-description'];

const HKDF_SALT = Buffer.from('openpay:bank:v2', 'utf8');

function llaveDeOrganizacion(maestra: Buffer, organizationId: string): Buffer {
  return Buffer.from(hkdfSync('sha256', maestra, HKDF_SALT, Buffer.from(organizationId, 'utf8'), 32));
}

const datoAsociado = (organizationId: string, field: BankField) =>
  Buffer.from(`${organizationId}|${field}`, 'utf8');

export function encryptBankValue(maestra: Buffer, organizationId: string, field: BankField, texto: string): Buffer {
  const nonce = randomBytes(12);
  const cifrador = createCipheriv('aes-256-gcm', llaveDeOrganizacion(maestra, organizationId), nonce);
  cifrador.setAAD(datoAsociado(organizationId, field));
  const cuerpo = Buffer.concat([cifrador.update(texto, 'utf8'), cifrador.final()]);
  return Buffer.concat([nonce, cuerpo, cifrador.getAuthTag()]);
}

/** Lanza si el cifrado no es de esa organización y ese campo, o si fue alterado. */
export function decryptBankValue(
  maestra: Buffer,
  organizationId: string,
  field: BankField,
  keyId: string,
  cifrado: Buffer,
): string {
  let llave: Buffer;
  let aad: Buffer;
  if (keyId === BANK_KEY_ID) {
    llave = llaveDeOrganizacion(maestra, organizationId);
    aad = datoAsociado(organizationId, field);
  } else if (keyId === 'bank-v1') {
    llave = maestra;
    aad = Buffer.from(organizationId, 'utf8');
  } else {
    throw new Error(`Versión de llave desconocida: ${keyId}`);
  }
  if (cifrado.length < 12 + 16) throw new Error('Cifrado demasiado corto');

  const descifrador = createDecipheriv('aes-256-gcm', llave, cifrado.subarray(0, 12));
  descifrador.setAAD(aad);
  descifrador.setAuthTag(cifrado.subarray(cifrado.length - 16));
  return Buffer.concat([
    descifrador.update(cifrado.subarray(12, cifrado.length - 16)),
    descifrador.final(),
  ]).toString('utf8');
}
