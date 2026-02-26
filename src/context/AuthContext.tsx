import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { getMyRole, type UserRole } from '../lib/profile'

type AuthContextValue = {
  session: Session | null
  user: User | null
  userRole: UserRole
  loading: boolean
  roleLoading: boolean
}

type AuthProviderProps = {
  children: ReactNode
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<UserRole>('free')
  const [roleLoading, setRoleLoading] = useState(true)

  useEffect(() => {
    let active = true

    const syncRole = async (nextUser: User | null) => {
      if (!nextUser) {
        if (!active) return
        setUserRole('free')
        setRoleLoading(false)
        return
      }

      if (active) {
        setRoleLoading(true)
      }
      const role = await getMyRole()
      if (!active) return
      setUserRole(role)
      setRoleLoading(false)
    }

    const loadSession = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        if (!active) return
        const nextSession = data.session ?? null
        setSession(nextSession)
        setLoading(false)
        void syncRole(nextSession?.user ?? null)
      } catch (err) {
        if (!active) return
        console.error('Erro ao recuperar sessao', err)
        setSession(null)
        setUserRole('free')
        setLoading(false)
        setRoleLoading(false)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return
      setSession(newSession)
      setLoading(false)
      void syncRole(newSession?.user ?? null)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const user = session?.user ?? null
  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      userRole,
      loading,
      roleLoading,
    }),
    [session, user, userRole, loading, roleLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro do AuthProvider')
  }
  return ctx
}
