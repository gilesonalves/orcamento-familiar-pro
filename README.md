# Orcamento Familiar

Aplicativo React + Vite empacotado com Capacitor para Android. O estado atual do app usa Supabase para autenticacao e persistencia de dados e RevenueCat para assinatura PRO via Google Play.

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS
- Capacitor Android
- Supabase Auth + banco
- RevenueCat (`@revenuecat/purchases-capacitor`)
- Reconhecimento de voz para lancamentos

## Recursos atuais

- Login com e-mail/senha e Google
- Recuperacao de senha com deep link mobile
- Tela `/update-password` para troca de senha
- Trial de 15 dias
- Plano Free com ate 15 lancamentos por mes
- Plano PRO com lancamentos ilimitados e recursos extras
- Paywall e restauracao de compras
- Lancamentos manuais e por voz via FAB

## Variaveis de ambiente

Use `.env.local` no desenvolvimento web e configure equivalentes no pipeline mobile:

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_REVENUECAT_ANDROID_PUBLIC_KEY=
VITE_REVENUECAT_IOS_PUBLIC_KEY=
VITE_REVENUECAT_PUBLIC_KEY=
VITE_REVENUECAT_OFFERING_ID=default
VITE_REVENUECAT_ENTITLEMENT_ID=pro
VITE_REVENUECAT_APP_USER_ID_MODE=preferred
VITE_REVENUECAT_PACKAGE_MONTHLY=rc_monthly
VITE_REVENUECAT_PACKAGE_ANNUAL=rc_annual
```

Observacoes:

- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` sao obrigatorias para o app atual.
- `VITE_REVENUECAT_ANDROID_PUBLIC_KEY` e a chave publica Android do RevenueCat.
- `VITE_REVENUECAT_IOS_PUBLIC_KEY` so e necessaria em builds iOS.
- `VITE_REVENUECAT_PUBLIC_KEY` existe apenas como fallback legado; prefira as chaves por plataforma.

## Desenvolvimento

```bash
npm install
npm run dev
```

O app web abre no endereco informado pelo Vite, normalmente `http://localhost:5173`.

## Build web

```bash
npm run build
npm run preview
```

O build web sai em `dist/`.

## Android com Capacitor

O projeto nativo fica em `android/` e recebe os arquivos web via `dist/`.

Fluxo comum:

```bash
npm run build
npx cap copy android
npx cap open android
```

Se houver mudanca de plugin nativo ou configuracao do Capacitor:

```bash
npx cap sync android
```

Deep links atualmente esperados pelo app Android:

- `gestorfamiliar://auth-callback`
- `gestorfamiliar://update-password`

## Release Android

- O repositorio nao deve ser tratado como "store-ready" por padrao.
- `android/app/build.gradle` so aplica assinatura de release quando as propriedades Gradle abaixo sao fornecidas externamente:
  - `ORCAMENTO_RELEASE_STORE_FILE`
  - `ORCAMENTO_RELEASE_STORE_PASSWORD`
  - `ORCAMENTO_RELEASE_KEY_ALIAS`
  - `ORCAMENTO_RELEASE_KEY_PASSWORD`
- Sem essas propriedades, o artefato precisa ser assinado fora do repositorio ou pelo CI.
- Artefatos gerados em `android/app/release/` nao devem ser versionados.

## Observacoes

- A base principal de dados do app e o Supabase; nao e mais um app puramente local.
- O contador do plano Free continua sendo controlado no cliente para o limite mensal atual.
- Existem arquivos de PWA em `public/`, mas o foco principal desta base e a publicacao Android recente.
