import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, hasSupabase } from '../lib/supabase.js'
import { trackEvent } from '../lib/analytics.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(hasSupabase)
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return undefined
    }

    let active = true

    supabase.auth.getSession().then(({ data, error: nextError }) => {
      if (!active) return
      if (nextError) setError(nextError)
      setSession(data.session ?? null)
      setLoading(false)
    })

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (_event === 'SIGNED_IN') trackEvent('sign_in_success', { method: 'google' })
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return false

    setError(null)
    setSigningIn(true)

    try {
      const { error: nextError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${window.location.pathname}${window.location.search}`
        }
      })
      if (nextError) throw nextError
      return true
    } catch (nextError) {
      setError(nextError)
      return false
    } finally {
      setSigningIn(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return false

    setError(null)

    try {
      const { error: nextError } = await supabase.auth.signOut()
      if (nextError) throw nextError
      return true
    } catch (nextError) {
      setError(nextError)
      return false
    }
  }, [])

  const value = useMemo(() => ({
    enabled: hasSupabase,
    loading,
    session,
    user: session?.user ?? null,
    signingIn,
    error,
    signInWithGoogle,
    signOut
  }), [loading, session, signingIn, error, signInWithGoogle, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
