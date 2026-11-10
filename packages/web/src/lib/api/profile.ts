import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';

export interface EnsuredProfile {
  profileId: string;
  accountId: string;
  balance: number;
}

// Idempotente: garantiza que existe (Profile + Account) para el user autenticado.
// El perfil lo crea la base al confirmar el correo (20261110180000_profile_on_signup.sql);
// esto queda como respaldo y para la cuenta. Se llama desde useAuth tras cada login.
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

    if (created) {
      profileId = created.id;
    } else {
      // Otra pestaña, o la base al confirmar el correo, lo creó entre la consulta y
      // la inserción (llave duplicada): se usa ese.
      const { data: yaEsta } = await supabase.from('Profile').select('id').eq('userId', user.id).maybeSingle();
      if (!yaEsta?.id) throw new Error(error?.message || 'No se pudo crear el perfil');
      profileId = yaEsta.id;
    }
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
