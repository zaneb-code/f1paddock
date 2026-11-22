/**
 * Catches a crash in the page below it and shows something readable.
 *
 * Without this, one thrown error during render unmounts the entire React
 * tree and the browser is left showing a blank page — no navbar, no message,
 * nothing to act on. That is the worst possible failure for anyone using or
 * marking this: the app looks dead and gives no clue why.
 *
 * It has to be a class. React has no hook equivalent of componentDidCatch,
 * because a function component cannot catch an error thrown by its own
 * children during rendering. This is the one place class syntax is still
 * required.
 *
 * It catches errors thrown while RENDERING, in lifecycle methods and in
 * constructors below it. It does NOT catch errors in event handlers, in
 * async callbacks, or during server requests — those never interrupt a
 * render, so they never blank the screen either.
 */

import { Component } from 'react'
import { Link } from 'react-router-dom'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, componentStack: '' }
  }

  /** Runs when a child throws. Whatever this returns becomes the new state. */
  static getDerivedStateFromError(error) {
    return { error }
  }

  /** Somewhere to log it. In a real deployment this would go to a service. */
  componentDidCatch(error, info) {
    console.error('Caught by ErrorBoundary:', error, info.componentStack)
    // Kept in state as well as logged, so the component stack is on screen.
    // "Something went wrong" with no location is not a bug report.
    this.setState({ componentStack: info.componentStack ?? '' })
  }

  render() {
    const { error, componentStack } = this.state

    if (!error) return this.props.children

    return (
      <div className="shell py-16">
        <div className="card mx-auto max-w-xl p-6">
          <p className="eyebrow mb-2 text-stop">Something broke</p>
          <h1 className="mb-3 text-3xl">This page stopped working</h1>

          <p className="mb-4 text-muted">
            The rest of the site is fine — only this page failed. Reloading usually clears it.
          </p>

          {/* The actual message, because "something went wrong" helps nobody. */}
          <pre className="mb-5 overflow-x-auto rounded-xl border border-line bg-surface-2 p-3 font-mono text-xs text-stop">
            {error.message || String(error)}
          </pre>

          {componentStack && (
            <details className="mb-5">
              <summary className="cursor-pointer text-sm text-muted hover:text-chalk">
                Where it happened
              </summary>
              <pre className="mt-2 max-h-56 overflow-auto rounded-xl border border-line bg-surface-2 p-3 font-mono text-[0.7rem] text-dim">
                {componentStack.trim()}
              </pre>
            </details>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
            <Link to="/" className="btn btn-sm btn-ghost" onClick={() => this.setState({ error: null })}>
              Back to the paddock
            </Link>
          </div>
        </div>
      </div>
    )
  }
}
