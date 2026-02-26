# Gestor Familiar (React + Vite + TypeScript + Tailwind)

Aplicativo web para controle de receitas, despesas e investimentos, com suporte a PWA e preparado para empacotar como app Android via Capacitor.

## Rodar em desenvolvimento

```bash
npm install
npm run dev
```

Abra o endereço mostrado pelo Vite (normalmente http://localhost:5173).

## Build de produção

```bash
npm run build
```

Os artefatos ficam em `dist/`. Para pré-visualizar localmente:

```bash
npm run preview
```

## PWA

- Manifesto em `public/manifest.webmanifest` com ícones em `public/icons/`.
- Service worker em `public/service-worker.js` registrando cache de assets (CacheFirst) e navegação (NetworkFirst).
- Registro do service worker em `src/main.tsx`.
- Botão “Instalar app” via componente `src/components/InstallPrompt.tsx` (ouve `beforeinstallprompt`).

### Testar e instalar no Chrome (Android)

1. Rode `npm run dev` e acesse a URL no celular (mesma rede).
2. Interaja com o app para permitir o cache inicial.
3. Toque no botão “Instalar app” (ou opção “Adicionar à tela inicial” do navegador).
4. Após instalado, abra o app no modo standalone; ele permanece disponível offline para assets já em cache e dados salvos no `localStorage`.

## Gerando APK com Capacitor (Android)

> O projeto usa Vite; a pasta de build é `dist` (referenciada em `capacitor.config.ts` como `webDir`).

1) Instalar dependências:
```bash
npm install
npm install @capacitor/core @capacitor/cli @capacitor/android
```

2) Inicializar o Capacitor (caso ainda não tenha feito):
```bash
npx cap init
npx cap add android
```

3) Gerar o build web:
```bash
npm run build
```

4) Copiar os arquivos de build para o Capacitor:
```bash
npx cap copy
```

4.1) Sincronizar plugins/config nativos (recomendado após alterar dependências/config):
```bash
npx cap sync android
```

5) Abrir o projeto Android no Android Studio:
```bash
npx cap open android
```

6) No Android Studio:
- Conecte um aparelho físico (modo desenvolvedor) ou crie um emulador.
- Clique em **Run ▶** para instalar e testar.
- Para gerar o APK: **Build > Build Bundle(s) / APK(s) > Build APK(s)** e anote o caminho gerado.

### Observações importantes
- A pasta `android/` (criada pelo Capacitor) é o projeto nativo. O código web permanece em `src/` e é copiado a cada `npx cap copy` a partir de `dist/`.
- O app não depende de APIs externas; os dados ficam em `localStorage`, que funciona dentro da WebView do Capacitor.
- Layout já usa container central com largura máxima (`max-w-5xl`). Se quiser um visual mais compacto em mobile, pode ajustar para `max-w-3xl` no container principal (`App`) mantendo `className="min-h-screen bg-slate-950 text-slate-50 flex justify-center"` e `className="w-full max-w-3xl p-4 space-y-4"`.

## Assinaturas PRO (Google Play + RevenueCat)

- Stack detectado neste projeto: **Capacitor + React + `@revenuecat/purchases-capacitor`**.
- Configure no `.env.local` (nunca commitar chaves reais):

```dotenv
VITE_REVENUECAT_PUBLIC_KEY=goog_xxxxxxxxxxxxxxxxx
VITE_REVENUECAT_ENTITLEMENT_ID=pro
VITE_REVENUECAT_OFFERING_ID=default
VITE_REVENUECAT_PACKAGE_MONTHLY=rc_monthly
VITE_REVENUECAT_PACKAGE_ANNUAL=rc_annual
VITE_REVENUECAT_APP_USER_ID_MODE=preferred
```

- `VITE_REVENUECAT_PUBLIC_KEY` deve ser a **Public SDK Key** da plataforma Google (`goog_...`).
- Não use Secret API Key no cliente.
- Tela de assinatura: rota `/settings`.
