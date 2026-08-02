import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// PWA (§22.3, §32.4): service worker-ul minimal face aplicatia instalabila.
// Doar in productie — in dev ar tine pagina „controlata" intre reload-uri si
// ar ascunde schimbarile de cod. Best-effort: fara SW, aplicatia merge la fel.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // neinregistrat — aplicatia ramane doar web
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
