import React from 'react'
import ReactDOM from 'react-dom/client'
import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"

import App from './v2/components/App.tsx'

import 'antd/dist/reset.css'
import 'primereact/resources/primereact.min.css'

import './v2/assets/css/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DndProvider backend={HTML5Backend}>
      <App />
    </DndProvider>
  </React.StrictMode>,
)
