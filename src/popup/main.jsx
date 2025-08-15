import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Popup from './Popup.jsx'
import './popup.css'    // ← 기존 popup.css 복사본

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Popup />
  </StrictMode>
)
