import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId) => {
    // maybeSingle() returns null (not error) when no row found
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfile(data)
    setLoading(false)
  }

  const signUp = async ({ email, phone, password, name, username }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, username, phone: phone || null } },
    })
    if (error) throw error
    // Profile is created by the DB trigger (handle_new_user) using SECURITY DEFINER.
    // We do NOT upsert here because no session exists yet → would get 401.
    return data
  }

  const signIn = async ({ identifier, password }) => {
    // identifier can be email, phone, or username
    let email = identifier.trim()
    if (!email.includes('@') && !email.startsWith('+')) {
      // It's a username — look up the email via anon key (profiles SELECT is open to authenticated users)
      // Use maybeSingle() so we get null (not a 406 error) when no row is found
      const { data: found, error: lookupErr } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', email.toLowerCase())
        .maybeSingle()
      if (lookupErr) throw new Error('Username lookup failed: ' + lookupErr.message)
      if (!found?.email) throw new Error('No account found with that username')
      email = found.email
    }
    const credentials = { password }
    if (email.startsWith('+')) {
      credentials.phone = email
    } else {
      credentials.email = email
    }
    const { data, error } = await supabase.auth.signInWithPassword(credentials)
    if (error) {
      // Translate Supabase error messages to user-friendly ones
      if (error.message?.toLowerCase().includes('invalid login')) throw new Error('Incorrect email or password')
      throw error
    }
    return data
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
  }

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  }

  const updateProfile = async (updates) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()
    if (error) throw error
    setProfile(data)
    return data
  }

  return (
    <AuthContext.Provider value={{
      user, profile, session, loading,
      signUp, signIn, signOut, resetPassword, updateProfile,
      refreshProfile: () => fetchProfile(user?.id),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
