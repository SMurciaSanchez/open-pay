import { supabase } from "@/lib/supabase"

export async function getCurrentProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("Profile")
    .select("*")
    .eq("userId", user.id)
    .single()

  if (error) return null
  return data
}

// RLS solo deja editar el perfil propio, y solo fullName, avatarUrl y phone
export async function updateProfile(profileId: string, updates: Record<string, any>) {
  const { data, error } = await supabase
    .from("Profile")
    .update({ ...updates, updatedAt: new Date().toISOString() })
    .eq("id", profileId)
    .select()
    .single()

  if (error) throw error
  return data
}
