import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useBracha } from './store'
import { applyTheme, watchSystemTheme } from './lib/theme'

// Appearance is explicit (default LIGHT) — stamp <html data-theme> before the
// first paint, re-stamp on preference change, and follow the OS only when the
// user chose "system". See src/lib/theme.ts for the why.
applyTheme(useBracha.getState().appearance)
useBracha.subscribe((s, prev) => {
  if (s.appearance !== prev.appearance) applyTheme(s.appearance)
})
watchSystemTheme(() => useBracha.getState().appearance)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
