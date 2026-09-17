import { supabase } from '../supabase';

export type EntityCategory =
  | 'TAX'
  | 'SOCIAL'
  | 'DONATION'
  | 'UTILITIES'
  | 'TELECOM'
  | 'OTHER';

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

export async function getEntityById(id: string): Promise<EntityReceiver | null> {
  const { data, error } = await supabase
    .from('EntityReceiver')
    .select('id, name, entityCode, category, description, logoUrl, isVerified, isActive')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as EntityReceiver | null) ?? null;
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
    p_idempotency_key: crypto.randomUUID(),
  });

  if (error) throw new Error(error.message);
  return data as PayToEntityResult;
}
