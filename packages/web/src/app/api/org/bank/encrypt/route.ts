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
 * Formato: AES-256-GCM, nonce(12) || cifrado || etiqueta(16). El id de la
 * organización va como dato asociado: un cifrado copiado a otra organización
 * no descifra.
 */
import { createCipheriv, randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';

const KEY_ID = 'bank-v1';
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

  let body: { organizationId?: unknown; values?: unknown };
  try {
    body = await req.json();
  } catch {
    return error('Cuerpo inválido.', 400);
  }
  const { organizationId, values } = body;
  if (
    typeof organizationId !== 'string' ||
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

  const ciphers = (values as string[]).map((texto) => {
    const nonce = randomBytes(12);
    const cifrador = createCipheriv('aes-256-gcm', key, nonce);
    cifrador.setAAD(Buffer.from(organizationId, 'utf8'));
    const cuerpo = Buffer.concat([cifrador.update(texto, 'utf8'), cifrador.final()]);
    // Formato de bytea que entiende la API de Supabase: \x seguido de hexadecimal
    return '\\x' + Buffer.concat([nonce, cuerpo, cifrador.getAuthTag()]).toString('hex');
  });

  return NextResponse.json({ keyId: KEY_ID, ciphers });
}
