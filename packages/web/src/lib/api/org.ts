/**
 * Organización, equipo y fondos.
 *
 * Todo pasa por el cliente del navegador con la sesión del usuario: las reglas
 * de quién puede qué viven en la base (RLS y funciones), no aquí. Si una
 * pantalla se equivoca y ofrece un botón que el rol no permite, la base lo
 * rechaza igual; lo que hace esta capa es traducir el error.
 */
import { supabase } from '../supabase';

export type OrgRole = 'CONFIGURATOR' | 'APPROVER' | 'TREASURER' | 'LEGAL_REP';
export type OrgKind = 'FOUNDATION' | 'NGO' | 'PUBLIC_ENTITY' | 'COMPANY' | 'OTHER';

export const ROLE_LABEL: Record<OrgRole, string> = {
  LEGAL_REP: 'Representante legal',
  CONFIGURATOR: 'Configurador',
  TREASURER: 'Tesorero',
  APPROVER: 'Aprobador',
};

export const ROLE_HINT: Record<OrgRole, string> = {
  LEGAL_REP: 'Arma el equipo y otorga accesos de auditoría',
  CONFIGURATOR: 'Crea fondos, rubros, contratos y proveedores',
  TREASURER: 'Registra pagos, importa extractos, concilia y cierra lotes',
  APPROVER: 'Aprueba o rechaza pagos',
};

export const KIND_LABEL: Record<OrgKind, string> = {
  FOUNDATION: 'Fundación',
  NGO: 'ONG',
  PUBLIC_ENTITY: 'Entidad pública',
  COMPANY: 'Empresa',
  OTHER: 'Otra',
};

export interface Organization {
  id: string;
  name: string;
  nit: string | null;
  kind: OrgKind;
}

export interface MyOrganization extends Organization {
  role: OrgRole;
}

export interface Member {
  id: string;
  profileId: string;
  fullName: string;
  email: string;
  role: OrgRole;
  revokedAt: string | null;
  createdAt: string;
}

export interface Fund {
  id: string;
  organizationId: string;
  name: string;
  purpose: string;
  totalAmount: number;
  isTotalPublic: boolean;
  currency: string;
  startsOn: string;
  endsOn: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
}

export interface Budget {
  id: string;
  fundId: string;
  category: string;
  amount: number;
}

export interface Contract {
  id: string;
  fundId: string;
  budgetId: string;
  object: string;
  value: number;
  isPublic: boolean;
  secopUrl: string | null;
  signedOn: string | null;
}

export interface Vendor {
  id: string;
  fundId: string;
  legalName: string;
  nit: string;
  revokedAt: string | null;
  createdAt: string;
}

/** Errores de la base, en palabras de la pantalla. */
export function mensajeDeError(e: unknown): string {
  const m = (e as { message?: string })?.message ?? String(e);
  if (/row-level security|permission denied|No autorizado/i.test(m)) {
    return 'Tu rol no permite hacer esto.';
  }
  if (/duplicate key.*nit|AuthorizedVendor_fundId_nit/i.test(m)) {
    return 'Ya hay un proveedor con ese NIT en este fondo.';
  }
  if (/Budget_fundId_category/i.test(m)) return 'Ya hay un rubro con ese nombre.';
  return m;
}

async function unwrap<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(mensajeDeError(error));
  return data as T;
}

let perfilCache: { userId: string; profileId: string } | null = null;

/** Profile.id del usuario con sesión. */
export async function myProfileId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No hay sesión');
  if (perfilCache?.userId === user.id) return perfilCache.profileId;
  const perfil = await unwrap(
    supabase.from('Profile').select('id').eq('userId', user.id).single<{ id: string }>(),
  );
  perfilCache = { userId: user.id, profileId: perfil.id };
  return perfil.id;
}

// ── Organización y equipo ──────────────────────────────────────

export async function myOrganizations(): Promise<MyOrganization[]> {
  const yo = await myProfileId();
  const filas = await unwrap(
    supabase
      .from('OrgMember')
      .select('role, Organization(id, name, nit, kind)')
      .eq('profileId', yo)
      .is('revokedAt', null),
  );
  return (filas as unknown as { role: OrgRole; Organization: Organization }[])
    .map((f) => ({ ...f.Organization, role: f.role }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createOrganization(name: string, nit: string, kind: OrgKind): Promise<string> {
  return unwrap(
    supabase.rpc('create_organization', { p_name: name, p_nit: nit, p_kind: kind }),
  );
}

export async function orgMembers(orgId: string): Promise<Member[]> {
  return unwrap(supabase.rpc('org_members', { p_org_id: orgId }));
}

export async function addMember(orgId: string, email: string, role: OrgRole): Promise<void> {
  await unwrap(supabase.rpc('add_org_member', { p_org_id: orgId, p_email: email, p_role: role }));
}

export async function revokeMember(memberId: string): Promise<void> {
  await unwrap(supabase.rpc('revoke_org_member', { p_member_id: memberId }));
}

// ── Fondos ─────────────────────────────────────────────────────

export async function listFunds(orgId: string): Promise<Fund[]> {
  return unwrap(
    supabase.from('Fund').select('*').eq('organizationId', orgId).order('createdAt'),
  );
}

export async function getFund(fundId: string): Promise<Fund & { organization: MyOrganization }> {
  const fondo = await unwrap(supabase.from('Fund').select('*').eq('id', fundId).single<Fund>());
  const org = (await myOrganizations()).find((o) => o.id === fondo.organizationId);
  if (!org) throw new Error('No perteneces a la organización de este fondo.');
  return { ...fondo, organization: org };
}

export interface NewFund {
  organizationId: string;
  name: string;
  purpose: string;
  totalAmount: number;
  isTotalPublic: boolean;
  startsOn: string;
  endsOn: string | null;
}

/**
 * Crea el fondo con las dos reglas que prueba el circuito: solo proveedores
 * autorizados y dentro del presupuesto. Quedan versionadas en FundRule, que es
 * lo que publica PublicFundRule.
 */
export async function createFund(f: NewFund): Promise<string> {
  const yo = await myProfileId();
  const fondo = await unwrap(
    supabase
      .from('Fund')
      .insert({ ...f, createdBy: yo, status: 'ACTIVE' })
      .select('id')
      .single<{ id: string }>(),
  );
  await unwrap(
    supabase.from('FundRule').insert([
      { fundId: fondo.id, kind: 'AUTHORIZED_VENDOR_ONLY', version: 1, createdBy: yo },
      { fundId: fondo.id, kind: 'WITHIN_BUDGET', version: 1, createdBy: yo },
    ]),
  );
  return fondo.id;
}

// ── Rubros, contratos y proveedores ────────────────────────────

export async function listBudgets(fundId: string): Promise<Budget[]> {
  return unwrap(supabase.from('Budget').select('*').eq('fundId', fundId).order('category'));
}

export async function createBudget(fundId: string, category: string, amount: number): Promise<void> {
  await unwrap(supabase.from('Budget').insert({ fundId, category, amount }));
}

export async function listContracts(fundId: string): Promise<Contract[]> {
  return unwrap(supabase.from('Contract').select('*').eq('fundId', fundId).order('createdAt'));
}

export async function createContract(c: Omit<Contract, 'id'>): Promise<void> {
  await unwrap(supabase.from('Contract').insert(c));
}

export async function listVendors(fundId: string): Promise<Vendor[]> {
  return unwrap(
    supabase.from('AuthorizedVendor').select('*').eq('fundId', fundId).order('createdAt'),
  );
}

export async function createVendor(fundId: string, legalName: string, nit: string): Promise<void> {
  await unwrap(supabase.from('AuthorizedVendor').insert({ fundId, legalName, nit }));
}

export async function revokeVendor(vendorId: string): Promise<void> {
  await unwrap(
    supabase
      .from('AuthorizedVendor')
      .update({ revokedAt: new Date().toISOString() })
      .eq('id', vendorId),
  );
}

/** Pesos con separador de miles, sin decimales. */
export function pesos(n: number | string): string {
  return Number(n).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });
}
