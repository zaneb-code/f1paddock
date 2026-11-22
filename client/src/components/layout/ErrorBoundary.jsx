import { Component } from 'react'
import { Link } from 'react-router-dom'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, componentStack: '' }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    console.error('Caught by ErrorBoundary:', error, info.componentStack)
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
