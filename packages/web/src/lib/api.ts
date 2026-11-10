import { supabase } from '@/lib/supabase';

export interface User {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  phone?: string;
}

// Obtiene o crea el perfil del usuario autenticado
async function getOrCreateProfile(): Promise<User> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw Object.assign(new Error('No autenticado'), { status: 401 });

  // Buscar perfil existente
  const { data: profile } = await supabase
    .from('Profile')
    .select('*')
    .eq('userId', user.id)
    .single();

  if (profile) return profile;

  // Crear perfil si no existe
  const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario';
  const { data: newProfile, error } = await supabase
    .from('Profile')
    .insert({
      userId: user.id,
      fullName,
      email: user.email!,
      phone: user.user_metadata?.phone || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Crear cuenta principal
  await supabase.from('Account').insert({
    profileId: newProfile.id,
    balance: 0,
    type: 'CHECKING',
    number: `ACC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    status: 'ACTIVE',
  });

  return newProfile;
}

const api = {
  getProfile: async (): Promise<User> => {
    return getOrCreateProfile();
  },
};

export default api;
