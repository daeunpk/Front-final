import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Report from './Report.jsx'
import './report.css'   // ← 기존 report.css 복사본

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Report />
  </StrictMode>
)
