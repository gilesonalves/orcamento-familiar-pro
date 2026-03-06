import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { PerfilOrcamento } from '../context/BudgetContext'

type CanAddResp = {
  allowed: boolean
  reason: string
  used: number
  limit_count: number
  period: string
}

type ConsumeResp = {
  ok: boolean
  reason: string
  used: number
  limit_count: number
  remaining: number
  period: string
}

type LogState = { step: string; [k: string]: any } | null

const firstRow = <T,>(data: unknown): T | null => {
  if (Array.isArray(data)) return (data[0] as T) ?? null
  return (data as T) ?? null
}

export default function DebugBilling() {
  const [log, setLog] = useState<LogState>(null)

  // parâmetros fáceis de mexer
  const now = useMemo(() => new Date(), [])
  const p_year = now.getFullYear()
  const p_month = now.getMonth() + 1

  // se seu escopo é por perfil, set aqui:
  const p_perfil: PerfilOrcamento | null = null // "familiar" | "pessoal" | null

  function ping() {
    setLog({
      step: 'PING',
      ts: Date.now(),
      mark: `DebugBilling MARK v1 - ${new Date().toISOString()}`,
    })
  }

  async function whoAmI() {
    const { data, error } = await supabase.auth.getUser()
    setLog({
      step: 'whoAmI',
      status: 'done',
      user: data?.user ?? null,
      error: error
        ? { message: error.message, details: (error as any).details, code: (error as any).code }
        : null,
    })
  }

  async function testCanAdd() {
    const args = { p_year, p_month, p_perfil }
    const { data, error } = await supabase.rpc('can_add_manual_expense', args)

    const row = firstRow<CanAddResp>(data)

    setLog({
      step: 'can_add_manual_expense',
      status: 'done',
      args,
      rawData: data ?? null,
      first: row ?? null,
      error: error
        ? { message: error.message, details: (error as any).details, hint: (error as any).hint, code: (error as any).code }
        : null,
    })
  }

  async function testConsume() {
    const args = { p_year, p_month, p_perfil }
    const { data, error } = await supabase.rpc('consume_manual_expense', args)

    const row = firstRow<ConsumeResp>(data)

    setLog({
      step: 'consume_manual_expense',
      status: 'done',
      args,
      rawData: data ?? null,
      first: row ?? null,
      error: error
        ? { message: error.message, details: (error as any).details, hint: (error as any).hint, code: (error as any).code }
        : null,
    })
  }

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui' }}>
      <h2>Debug Billing / RPC</h2>

      <div style={{ marginBottom: 12, opacity: 0.85 }}>
        <div>
          <b>Args atuais:</b> year={p_year} month={p_month} perfil={String(p_perfil)}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button onClick={ping}>PING (setLog)</button>
        <button onClick={whoAmI}>Quem sou eu (auth.getUser)</button>
        <button onClick={testCanAdd}>RPC: can_add_manual_expense</button>
        <button onClick={testConsume}>RPC: consume_manual_expense</button>
      </div>

      <pre
        style={{
          background: '#111',
          color: '#0f0',
          padding: 12,
          borderRadius: 8,
          overflow: 'auto',
          maxHeight: 520,
        }}
      >
        {JSON.stringify(log, null, 2)}
      </pre>
    </div>
  )
}
