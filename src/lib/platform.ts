import { Capacitor } from '@capacitor/core'

/**
 * Detecta se o app está rodando como nativo (Android/iOS WebView) vs web (navegador).
 * Use esta função para todas as decisões "app vs web".
 */
export function isNativeApp(): boolean {
  return Capacitor.getPlatform() !== 'web'
}
