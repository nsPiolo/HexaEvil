import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './presentation/App'
import { applyLanguage, startingLanguage } from './presentation/i18n'
import { loadOptions } from './presentation/storage'
import './index.css'

// Avant le premier rendu : sinon le menu s'afficherait en français puis basculerait.
applyLanguage(startingLanguage(loadOptions().language))

const root = document.getElementById('root')
if (!root) throw new Error('#root introuvable')
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
