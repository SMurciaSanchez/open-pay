import { supabase } from "@/lib/supabase"

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("userId", userId)
    .single()

  if (error) throw error
  return data
}

export async function updateUserProfile(userId: string, updates: Record<string, any>) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("userId", userId)
    .select()
    .single()

  if (error) throw error
  return data
}
