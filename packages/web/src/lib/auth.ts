// Re-exporta el hook de autenticación real (Supabase)
// Los componentes que importaban de @/lib/auth deben migrar a @/hooks/use-auth
export { useAuth } from '@/hooks/use-auth';
