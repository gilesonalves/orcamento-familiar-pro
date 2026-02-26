import ReactDOM from 'react-dom/client'
import App from './App'
import { setupMobileAuthListener } from './mobileAuth'
import './index.css'

setupMobileAuthListener()

// Evita que um service worker antigo (build mobile/produção) quebre o HMR no dev server
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => registration.unregister())
  })
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <App />
)
