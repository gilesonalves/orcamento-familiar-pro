import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { supabase } from './lib/supabaseClient'
import { isNativeApp } from './lib/platform'

function setupMobileAuthListener() {
  if (!isNativeApp()) {
    return
  }

  App.addListener('appUrlOpen', async ({ url }) => {
    try {
      if (!url) return

      // Exemplo de URL: gestorfamiliar://auth-callback?code=XXX&state=YYY
      if (!url.startsWith('gestorfamiliar://auth-callback')) {
        return
      }

      // Fecha o navegador externo
      await Browser.close()

      const parsed = new URL(url)
      const code = parsed.searchParams.get('code')

      // Troca o code pela sessão do usuário no Supabase
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
          console.error('[appUrlOpen] Erro ao trocar code por sessão:', error)
          return
        }

        // Não precisa fazer mais nada aqui: o onAuthStateChange do AuthWrapper
        // já vai atualizar a UI quando a sessão mudar.
        return
      }

      const hash = parsed.hash ? parsed.hash : ''
      if (!hash) {
        return
      }

      const fragment = hash.startsWith('#') ? hash.slice(1) : hash
      const params = new URLSearchParams(fragment)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (!accessToken || !refreshToken) {
        return
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (error) {
        console.error('[appUrlOpen] Erro ao criar sessão via fragmento OAuth:', error)
        return
      }
    } catch {
      console.error('Erro no listener appUrlOpen.')
    }
  })
}

export { setupMobileAuthListener }
