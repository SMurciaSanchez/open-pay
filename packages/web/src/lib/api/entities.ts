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


// payToEntity() se eliminó: el RPC pay_to_entity descuenta el saldo del remitente
// sin que nada llegue a la entidad. El pago a entidades está congelado
// (docs/PLAN_OPENPAY_ZK.md §6). Estos tipos y etiquetas siguen en uso para
// mostrar transacciones antiguas en TransactionDetail.
