import { SpeechRecognition } from '@capacitor-community/speech-recognition'
import { isNativeApp } from '../lib/platform'

type SpeechExpenseErrorCode =
  | 'NOT_NATIVE'
  | 'PERMISSION_DENIED'
  | 'NOT_AVAILABLE'
  | 'EMPTY_TRANSCRIPT'
  | 'UNKNOWN'

export class SpeechExpenseError extends Error {
  code: SpeechExpenseErrorCode

  constructor(code: SpeechExpenseErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

export const startExpenseSpeechRecognition = async () => {
  if (!isNativeApp()) {
    throw new SpeechExpenseError(
      'NOT_NATIVE',
      'Comando de voz disponível apenas no app',
    )
  }

  const availability = await SpeechRecognition.available()
  if (!availability.available) {
    throw new SpeechExpenseError(
      'NOT_AVAILABLE',
      'Reconhecimento de voz não disponível neste dispositivo.',
    )
  }

  const permission = await SpeechRecognition.checkPermissions()
  if (permission.speechRecognition !== 'granted') {
    const requested = await SpeechRecognition.requestPermissions()
    if (requested.speechRecognition !== 'granted') {
      throw new SpeechExpenseError(
        'PERMISSION_DENIED',
        'Permissão de microfone negada.',
      )
    }
  }

  const result = await SpeechRecognition.start({
    language: 'pt-BR',
    maxResults: 1,
    prompt: 'Fale a despesa',
    popup: true,
    partialResults: false,
  })

  const transcript = result.matches?.[0]?.trim()
  if (!transcript) {
    throw new SpeechExpenseError(
      'EMPTY_TRANSCRIPT',
      'Não consegui entender. Tente novamente.',
    )
  }

  return transcript
}

export const getSpeechExpenseErrorMessage = (error: unknown) => {
  if (error instanceof SpeechExpenseError) {
    return error.message
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    if (message.includes('permission')) {
      return 'Permissão de microfone negada.'
    }

    if (message.includes('available')) {
      return 'Reconhecimento de voz não disponível neste dispositivo.'
    }

    return error.message || 'Não foi possível capturar o comando de voz.'
  }

  return 'Não foi possível capturar o comando de voz.'
}
