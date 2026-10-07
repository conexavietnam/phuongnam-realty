import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { dataStorage } from '@/services/dataStorage'
import { installImageFallback } from '@/utils/imageFallback'
import './index.css'

installImageFallback()

// Load CMS content from the API first; bundled JSON is used when the API is unreachable.
dataStorage.init().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
})
