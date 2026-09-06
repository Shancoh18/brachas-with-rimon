import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react'
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

// Anything React can't catch (async handlers, promise rejections) still lands
// in the console with a stable prefix, so a WKWebView device log is greppable.
window.addEventListener('error', (e) => console.error('[bracha] uncaught', e.error ?? e.message))
window.addEventListener('unhandledrejection', (e) => console.error('[bracha] unhandled rejection', e.reason))

/**
 * Last line of defence: a render-time throw anywhere below <App/> would
 * otherwise unmount the whole tree to a blank white page (App Review tests
 * exactly that kind of screen). The card offers a reset that clears only the
 * VOLATILE slices — cached readings, remote lessons, and the current screen —
 * never progress, streaks, or the account. Class component by necessity:
 * error boundaries have no hook equivalent.
 */
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[bracha] render crash', error, info.componentStack)
  }

  reset = () => {
    useBracha.setState({ parsha: null, dailyThought: null, remoteLessons: [], screen: 'welcome', tab: 'bless' })
    this.setState({ failed: false })
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="grain min-h-dvh bg-cream px-6 pb-16 pt-20 text-espresso">
        <div className="mx-auto max-w-[380px] rounded-[2rem] bg-espresso/[0.045] p-1.5 ring-1 ring-espresso/[0.06]">
          <div className="rounded-[calc(2rem-0.375rem)] bg-white/75 px-6 py-8 text-center">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold">Rimon tripped</p>
            <h1 className="mt-3 font-display text-[30px] font-bold leading-tight">Something went wrong</h1>
            <p className="mt-3 text-[13.5px] leading-relaxed text-espresso-soft">
              Your streaks and account are safe. Resetting this screen clears only today’s cached readings.
            </p>
            <button
              onClick={this.reset}
              className="mt-6 inline-flex items-center gap-3 rounded-full bg-espresso py-2.5 pl-6 pr-2.5 text-[14px] font-semibold text-cream active:scale-[0.98]"
            >
              Reset this screen
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-[13px]">↻</span>
            </button>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-[320px] text-center text-[10.5px] leading-relaxed text-mocha">
          This app is a study aid. For any practical halachic question, consult a qualified rabbi.
        </p>
      </main>
    )
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
