import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'Method not allowed' })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null

  if (!token) {
    return jsonResponse(401, {
      ok: false,
      error: 'Missing authorization token',
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return jsonResponse(500, {
      ok: false,
      error: 'Missing Supabase environment variables',
    })
  }

  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })

  const { data: userData, error: userError } = await anonClient.auth.getUser()
  if (userError || !userData?.user) {
    return jsonResponse(401, { ok: false, error: 'Unauthorized' })
  }

  const { data: callerProfile, error: profileError } = await anonClient
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (profileError) {
    return jsonResponse(500, { ok: false, error: 'Erro ao carregar perfil' })
  }

  if (callerProfile?.role !== 'admin') {
    return jsonResponse(403, { ok: false, error: 'Forbidden' })
  }

  let body: { email?: string; action?: 'set_guest' | 'set_free' }
  try {
    body = await req.json()
  } catch {
    return jsonResponse(400, { ok: false, error: 'Invalid JSON body' })
  }

  const email =
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (!email) {
    return jsonResponse(400, { ok: false, error: 'Missing email' })
  }

  const action = body.action === 'set_free' ? 'set_free' : 'set_guest'
  const targetRole = action === 'set_free' ? 'free' : 'guest'

  const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

  const { data: targetData, error: targetError } =
    await serviceClient.auth.admin.getUserByEmail(email)

  if (targetError) {
    return jsonResponse(500, { ok: false, error: 'Erro ao buscar usuario' })
  }

  if (!targetData?.user) {
    return jsonResponse(404, {
      ok: false,
      error: 'usuário ainda não fez login',
    })
  }

  const { error: upsertError } = await serviceClient
    .from('profiles')
    .upsert(
      {
        id: targetData.user.id,
        email: targetData.user.email,
        role: targetRole,
      },
      { onConflict: 'id' },
    )

  if (upsertError) {
    return jsonResponse(500, {
      ok: false,
      error: 'Erro ao atualizar perfil',
    })
  }

  return jsonResponse(200, { ok: true, email, role: targetRole })
})
