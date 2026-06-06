import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { GardenProvider } from './lib/GardenContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GardenProvider>
      <App />
    </GardenProvider>
  </React.StrictMode>,
)

// Service worker registreren (PWA: installeerbaar + meldingen).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* stil falen: app werkt ook zonder service worker */
    })
  })
}
