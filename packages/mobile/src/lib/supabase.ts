import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Tipos del modelo de datos
export interface Profile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  phone?: string;
}

export interface Account {
  id: string;
  profileId: string;
  balance: number;
  type: string;
  number: string;
  status: string;
}

export type OnChainStatus = 'PENDING' | 'ANCHORED' | 'FAILED' | 'SKIPPED';

export type EntityCategory =
  | 'TAX' | 'SOCIAL' | 'DONATION' | 'UTILITIES' | 'TELECOM' | 'OTHER';

export interface EntityReceiver {
  id: string;
  name: string;
  entityCode: string;
  category: EntityCategory;
  description: string | null;
  logoUrl: string | null;
  isVerified: boolean;
  isActive: boolean;
}

export interface TransactionEntityRef {
  id: string;
  name: string;
  entityCode: string;
  category: string;
  logoUrl: string | null;
}

export interface Transaction {
  id: string;
  senderId: string;
  receiverId: string | null;
  amount: number;
  description?: string;
  status: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  onChainTxHash?: string | null;
  onChainStatus?: OnChainStatus | null;
  anchoredAt?: string | null;
  isEntityPayment?: boolean;
  entityReceiver?: TransactionEntityRef | null;
}

// Obtiene o crea el perfil del usuario autenticado
export async function getOrCreateProfile(): Promise<Profile> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('No autenticado');

  const { data: profile } = await supabase
    .from('Profile')
    .select('*')
    .eq('userId', user.id)
    .single();

  if (profile) return profile;

  const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario';
  const { data: newProfile, error } = await supabase
    .from('Profile')
    .insert({ userId: user.id, fullName, email: user.email! })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await supabase.from('Account').insert({
    profileId: newProfile.id,
    balance: 0,
    type: 'CHECKING',
    number: `ACC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    status: 'ACTIVE',
  });

  return newProfile;
}

// Obtiene la cuenta principal del usuario
export async function getAccount(profileId: string): Promise<Account | null> {
  const { data } = await supabase
    .from('Account')
    .select('*')
    .eq('profileId', profileId)
    .eq('status', 'ACTIVE')
    .single();
  return data;
}

const ENTITY_JOIN = 'entityReceiver:EntityReceiver(id, name, entityCode, category, logoUrl)';

// Obtiene transacciones del usuario
export async function getTransactions(profileId: string, limit = 20): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('Transaction')
    .select(`*, ${ENTITY_JOIN}`)
    .or(`senderId.eq.${profileId},receiverId.eq.${profileId}`)
    .order('createdAt', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data || []) as Transaction[];
}

export const CATEGORY_LABELS: Record<EntityCategory, string> = {
  TAX: 'Impuestos',
  SOCIAL: 'Programas sociales',
  DONATION: 'Donaciones',
  UTILITIES: 'Servicios públicos',
  TELECOM: 'Telecomunicaciones',
  OTHER: 'Otros',
};

export async function listEntities(): Promise<EntityReceiver[]> {
  const { data, error } = await supabase
    .from('EntityReceiver')
    .select('id, name, entityCode, category, description, logoUrl, isVerified, isActive')
    .eq('isActive', true)
    .eq('isVerified', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as EntityReceiver[];
}

export interface PayToEntityResult {
  id: string;
  status: 'completed' | 'already_processed';
  amount?: number;
  entityId?: string;
  entityCode?: string;
}

export async function payToEntity(params: {
  senderId: string;
  entityCode: string;
  amount: number;
  description: string;
}): Promise<PayToEntityResult> {
  const { data, error } = await supabase.rpc('pay_to_entity', {
    p_sender_id: params.senderId,
    p_entity_code: params.entityCode,
    p_amount: params.amount,
    p_description: params.description,
    p_idempotency_key: Math.random().toString(36).substring(2) + Date.now().toString(36),
  });

  if (error) throw new Error(error.message);
  return data as PayToEntityResult;
}

// Busca un perfil por email para transferencias
export async function getProfileByEmail(email: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('Profile')
    .select('*')
    .eq('email', email)
    .single();
  return data;
}

// Ejecuta una transferencia de fondos
export async function transferFunds(
  senderId: string,
  receiverId: string,
  amount: number,
  description: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('transfer_funds', {
    p_sender_id: senderId,
    p_receiver_id: receiverId,
    p_amount: amount,
    p_description: description,
    p_idempotency_key: Math.random().toString(36).substring(2),
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}
