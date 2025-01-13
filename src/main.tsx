import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './v2/components/App.tsx'

import './v2/assets/css/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
