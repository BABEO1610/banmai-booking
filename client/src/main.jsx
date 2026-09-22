import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import MotionProvider from './components/motion/MotionProvider.jsx'
import './phase1.css'
import './studio-design.css'
import './photographic-art.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MotionProvider>
      <App />
    </MotionProvider>
  </StrictMode>,
)
