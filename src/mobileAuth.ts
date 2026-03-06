import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { supabase } from './lib/supabaseClient'
import { isNativeApp } from './lib/platform'

async function handleIncomingUrl(url?: string) {
  try {
    if (!url) return

    if (
      !url.startsWith('gestorfamiliar://auth-callback') &&
      !url.startsWith('gestorfamiliar://update-password')
    ) {
      return
    }

    await Browser.close().catch(() => {})

    const parsed = new URL(url)
    const code = parsed.searchParams.get('code')

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        console.error('[deep link] exchangeCodeForSession:', error)
        return
      }

      if (url.startsWith('gestorfamiliar://update-password')) {
        window.location.replace('/update-password')
      }
      return
    }

    const fragment = parsed.hash.startsWith('#')
      ? parsed.hash.slice(1)
      : parsed.hash

    if (fragment) {
      const params = new URLSearchParams(fragment)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (error) {
          console.error('[deep link] setSession:', error)
          return
        }
      }
    }

    if (url.startsWith('gestorfamiliar://update-password')) {
      window.location.replace('/update-password')
    }
  } catch (err) {
    console.error('[deep link] erro:', err)
  }
}

function setupMobileAuthListener() {
  if (!isNativeApp()) return

  App.addListener('appUrlOpen', async ({ url }) => {
    await handleIncomingUrl(url)
  })

  App.getLaunchUrl().then((launchUrl) => {
    if (launchUrl?.url) handleIncomingUrl(launchUrl.url)
  })
}

export { setupMobileAuthListener }