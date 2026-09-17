import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';

export interface EnsuredProfile {
  profileId: string;
  accountId: string;
  balance: number;
}

// Idempotente: garantiza que existe (Profile + Account) para el user autenticado.
// Supabase Auth solo crea filas en auth.users — el modelo de dominio (Profile, Account)
// vive en public.* y no se autogenera. Esto se llama desde useAuth tras cada login.
export async function ensureProfile(user: User): Promise<EnsuredProfile> {
  const { data: existing } = await supabase
    .from('Profile')
    .select('id')
    .eq('userId', user.id)
    .maybeSingle();

  let profileId: string;

  if (existing?.id) {
    profileId = existing.id;
  } else {
    const fullName =
      (user.user_metadata?.full_name as string | undefined) ||
      user.email?.split('@')[0] ||
      'Usuario';

    const { data: created, error } = await supabase
      .from('Profile')
      .insert({ userId: user.id, fullName, email: user.email! })
      .select('id')
      .single();

    if (error || !created) throw new Error(error?.message || 'No se pudo crear el perfil');
    profileId = created.id;
  }

  const { data: account } = await supabase
    .from('Account')
    .select('id, balance')
    .eq('profileId', profileId)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (account?.id) {
    return { profileId, accountId: account.id, balance: Number(account.balance) };
  }

  const number = `ACC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const { data: newAccount, error: accErr } = await supabase
    .from('Account')
    .insert({ profileId, balance: 0, type: 'CHECKING', number, status: 'ACTIVE' })
    .select('id, balance')
    .single();

  if (accErr || !newAccount) throw new Error(accErr?.message || 'No se pudo crear la cuenta');

  return { profileId, accountId: newAccount.id, balance: Number(newAccount.balance) };
}
