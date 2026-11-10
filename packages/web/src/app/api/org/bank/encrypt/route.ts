/**
 * Cifra datos bancarios (N3) antes de guardarlos: el número de cuenta de la
 * organización y la glosa de cada movimiento, que suele traer el nombre de la
 * contraparte.
 *
 * La llave (BANK_DATA_KEY) vive solo en el servidor. El navegador manda el
 * texto, recibe el cifrado y lo inserta él mismo con la sesión del usuario, de
 * modo que quién puede escribir lo siguen decidiendo las reglas de la base.
 * Aquí solo se comprueba que quien pide cifrar es tesorero de la organización.
 *
 * El formato (llave por organización, organización y campo como dato
 * asociado) está en lib/server/bankCrypto.ts.
 */
import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { BANK_FIELDS, BANK_KEY_ID, encryptBankValue, type BankField } from '@/lib/server/bankCrypto';

export const runtime = 'nodejs';

const MAX_VALORES = 2000;
const MAX_LARGO = 500;

function llave(): Buffer | null {
  const hex = process.env.BANK_DATA_KEY ?? '';
  return /^[0-9a-fA-F]{64}$/.test(hex) ? Buffer.from(hex, 'hex') : null;
}

const error = (mensaje: string, status: number) => NextResponse.json({ error: mensaje }, { status });

export async function POST(req: Request) {
  const key = llave();
  if (!key) return error('El servidor no tiene configurada la llave de datos bancarios.', 500);

  const token = /^Bearer (.+)$/.exec(req.headers.get('authorization') ?? '')?.[1];
  if (!token) return error('Falta la sesión.', 401);

  let body: { organizationId?: unknown; field?: unknown; values?: unknown };
  try {
    body = await req.json();
  } catch {
    return error('Cuerpo inválido.', 400);
  }
  const { organizationId, field, values } = body;
  if (
    typeof organizationId !== 'string' ||
    !BANK_FIELDS.includes(field as BankField) ||
    !Array.isArray(values) ||
    values.length === 0 ||
    values.length > MAX_VALORES ||
    values.some((v) => typeof v !== 'string' || v.length > MAX_LARGO)
  ) {
    return error('Datos inválidos.', 400);
  }

  // Con el token del usuario: la base dice si es tesorero de esa organización.
  const { data: esTesorero, error: rolError } = await getSupabaseClient(token).rpc('has_org_role', {
    p_org_id: organizationId,
    p_roles: ['TREASURER'],
  });
  if (rolError || esTesorero !== true) return error('Tu rol no permite hacer esto.', 403);

  // Formato de bytea que entiende la API de Supabase: \x seguido de hexadecimal
  const ciphers = (values as string[]).map(
    (texto) => '\\x' + encryptBankValue(key, organizationId, field as BankField, texto).toString('hex'),
  );

  return NextResponse.json({ keyId: BANK_KEY_ID, ciphers });
}
