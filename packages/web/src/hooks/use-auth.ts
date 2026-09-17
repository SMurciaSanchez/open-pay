"use client"
import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { ensureProfile } from "@/lib/api/profile"
import type { User, Session } from "@supabase/supabase-js"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  // Track last user id we provisioned so we don't hit the DB on every re-render
  // or every auth-state tick (Supabase fires them on token refresh too).
  const provisionedRef = useRef<string | null>(null)

  useEffect(() => {
    const provision = (u: User | null) => {
      if (!u || provisionedRef.current === u.id) return
      provisionedRef.current = u.id
      ensureProfile(u).catch(err => {
        console.error('ensureProfile failed:', err)
        provisionedRef.current = null
      })
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      provision(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      provision(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, session, loading, isAuthenticated: !!user }
}
