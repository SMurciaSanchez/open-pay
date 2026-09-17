import { supabase } from "@/lib/supabase"

export async function getCurrentProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("userId", user.id)
    .single()

  if (error) return null
  return data
}

export async function updateProfile(userId: string, updates: Record<string, any>) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("userId", userId)
    .select()
    .single()

  if (error) throw error
  return data
}
