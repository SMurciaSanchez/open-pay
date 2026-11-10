/**
 * Lee datos bancarios cifrados (N3): el número completo de una cuenta de la
 * organización o las glosas de los movimientos de sus extractos.
 *
 * Solo tesorería. El navegador no manda cifrados: manda qué quiere leer (una
 * cuenta o unos extractos de una organización). El servidor busca esas filas
 * con la sesión del usuario —así las reglas de la base siguen decidiendo qué
 * existe para él— y solo descifra lo que es de esa organización. La llave nunca
 * sale del servidor.
 *
 *   { organizationId, accountId }            → { number }
 *   { organizationId, statementIds: [...] }  → { descriptions: { <id del movimiento>: texto } }
 */
import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { decryptBankValue, type BankField } from '@/lib/server/bankCrypto';

export const runtime = 'nodejs';

const MAX_EXTRACTOS = 24;

function llave(): Buffer | null {
  const hex = process.env.BANK_DATA_KEY ?? '';
  return /^[0-9a-fA-F]{64}$/.test(hex) ? Buffer.from(hex, 'hex') : null;
}

// Lo descifrado no se guarda en ninguna caché intermedia.
const responder = (cuerpo: unknown, status = 200) =>
  NextResponse.json(cuerpo, { status, headers: { 'Cache-Control': 'no-store' } });
const error = (mensaje: string, status: number) => responder({ error: mensaje }, status);

/** bytea como lo entrega la API de Supabase ('\x' + hexadecimal) → bytes. */
const bytes = (bytea: string) => Buffer.from(bytea.replace(/^\\x/, ''), 'hex');

function abrir(key: Buffer, org: string, campo: BankField, keyId: string, cifrado: string): string | null {
  try {
    return decryptBankValue(key, org, campo, keyId, bytes(cifrado));
  } catch {
    // Cifrado de otra organización, de otro campo, alterado o de una llave que ya no está.
    return null;
  }
}

export async function POST(req: Request) {
  const key = llave();
  if (!key) return error('El servidor no tiene configurada la llave de datos bancarios.', 500);

  const token = /^Bearer (.+)$/.exec(req.headers.get('authorization') ?? '')?.[1];
  if (!token) return error('Falta la sesión.', 401);

  const body = (await req.json().catch(() => null)) as {
    organizationId?: unknown;
    accountId?: unknown;
    statementIds?: unknown;
  } | null;
  if (!body || typeof body.organizationId !== 'string') return error('Datos inválidos.', 400);
  const { organizationId, accountId, statementIds } = body;

  const user = getSupabaseClient(token);
  const { data: esTesorero, error: rolError } = await user.rpc('has_org_role', {
    p_org_id: organizationId,
    p_roles: ['TREASURER'],
  });
  if (rolError || esTesorero !== true) return error('Tu rol no permite hacer esto.', 403);

  if (typeof accountId === 'string') {
    const { data: cuenta } = await user
      .from('OrgBankAccount')
      .select('numberCipher, keyId')
      .eq('id', accountId)
      .eq('organizationId', organizationId)
      .maybeSingle<{ numberCipher: string; keyId: string }>();
    if (!cuenta) return error('No existe esa cuenta en la organización.', 404);
    const number = abrir(key, organizationId, 'account-number', cuenta.keyId, cuenta.numberCipher);
    if (number === null) return error('No se pudo leer el número: la llave del servidor no es la que lo cifró.', 500);
    return responder({ number });
  }

  if (
    Array.isArray(statementIds) &&
    statementIds.length > 0 &&
    statementIds.length <= MAX_EXTRACTOS &&
    statementIds.every((s) => typeof s === 'string')
  ) {
    // Solo extractos de ESTA organización: la llave se deriva de ella.
    const { data: extractos } = await user
      .from('BankStatement')
      .select('id')
      .in('id', statementIds as string[])
      .eq('organizationId', organizationId);
    const propios = (extractos ?? []).map((e: { id: string }) => e.id);
    if (propios.length === 0) return responder({ descriptions: {} });

    const { data: movimientos } = await user
      .from('BankMovement')
      .select('id, descriptionCipher, keyId')
      .in('statementId', propios)
      .not('descriptionCipher', 'is', null);

    const descriptions: Record<string, string> = {};
    for (const m of (movimientos ?? []) as { id: string; descriptionCipher: string; keyId: string }[]) {
      const texto = abrir(key, organizationId, 'movement-description', m.keyId, m.descriptionCipher);
      if (texto !== null) descriptions[m.id] = texto;
    }
    return responder({ descriptions });
  }

  return error('Datos inválidos.', 400);
}
