import { supabase } from './supabaseClient'

export type UserRole = 'admin' | 'guest' | 'free' | 'premium'

const isUserRole = (value: unknown): value is UserRole =>
  value === 'admin' ||
  value === 'guest' ||
  value === 'free' ||
  value === 'premium'

export async function getMyRole(): Promise<UserRole> {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user) {
      return 'free'
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle()

    if (error || !data?.role) {
      return 'free'
    }

    return isUserRole(data.role) ? data.role : 'free'
  } catch (err) {
    console.error('Erro ao obter role do usuario', err)
    return 'free'
  }
}
