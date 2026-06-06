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
