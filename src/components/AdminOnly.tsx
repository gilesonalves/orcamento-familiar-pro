import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type Props = {
  children: ReactNode
}

export function AdminOnly({ children }: Props) {
  const { userRole, roleLoading } = useAuth()

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
        <p className="text-sm text-slate-400">Carregando...</p>
      </div>
    )
  }

  if (userRole !== 'admin') {
    return <Navigate to="/home" replace />
  }

  return <>{children}</>
}
