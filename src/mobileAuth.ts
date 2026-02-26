import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { supabase } from './lib/supabaseClient'

function setupMobileAuthListener() {
  App.addListener('appUrlOpen', async ({ url }) => {
    try {
      if (!url) return
      console.log('Deep link recebido:', url)

      // Exemplo de URL: gestorfamiliar://auth-callback?code=XXX&state=YYY
      if (!url.startsWith('gestorfamiliar://auth-callback')) {
        return
      }

      // Fecha o navegador externo
      await Browser.close()

      const parsed = new URL(url)
      const code = parsed.searchParams.get('code')

      if (!code) {
        console.log('Deep link sem "code" na query, tentando fragmento...')
      } else {
        console.log('Deep link com code encontrado.')
      }

      // Troca o code pela sessão do usuário no Supabase
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
          console.error('Erro ao trocar code por sessão', error)
          return
        }

        console.log('Sessão criada via deep link:', data.session?.user?.email)
        // Não precisa fazer mais nada aqui: o onAuthStateChange do AuthWrapper
        // já vai atualizar a UI quando a sessão mudar.
        return
      }

      const hash = parsed.hash ? parsed.hash : ''
      if (!hash) {
        console.warn('Deep link sem fragmento OAuth (#).')
        return
      }

      const fragment = hash.startsWith('#') ? hash.slice(1) : hash
      const params = new URLSearchParams(fragment)
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')

      console.log(
        'Tokens no fragmento:',
        access_token ? 'access_token OK' : 'access_token vazio',
        refresh_token ? 'refresh_token OK' : 'refresh_token vazio',
      )

      if (!access_token || !refresh_token) {
        return
      }

      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      })

      if (error) {
        console.error(
          'Erro ao criar sessão via fragmento OAuth',
          error,
          url,
        )
        return
      }

      console.log('Sessão criada via fragmento OAuth.')
    } catch (err) {
      console.error('Erro no listener appUrlOpen', err)
    }
  })
}

export { setupMobileAuthListener }
