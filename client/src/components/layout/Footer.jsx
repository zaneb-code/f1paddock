import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-surface/60">
      <div className="shell flex flex-wrap justify-between gap-8 py-10">
        <div className="max-w-sm">
          <p className="mb-2 font-display text-xl font-bold">F1Paddock</p>
          <p className="text-sm text-muted">
            A social platform for Formula 1 fans. Built as a semester project for Web
            Programming.
          </p>
        </div>

        <nav className="flex flex-col gap-2 text-sm" aria-label="Footer">
          <Link to="/races" className="text-muted transition-colors hover:text-accent">
            Race calendar
          </Link>
          <Link to="/communities" className="text-muted transition-colors hover:text-accent">
            Communities
          </Link>
          <Link to="/predictions" className="text-muted transition-colors hover:text-accent">
            Predictions
          </Link>
          <Link to="/leaderboard" className="text-muted transition-colors hover:text-accent">
            Leaderboard
          </Link>
        </nav>

        <div className="text-sm">
          <p className="eyebrow mb-2">Data</p>
          <a
            href="https://github.com/jolpica/jolpica-f1"
            target="_blank"
            rel="noreferrer"
            className="block text-muted transition-colors hover:text-accent"
          >
            Jolpica-F1 API
          </a>
          <p className="mt-1 max-w-[16rem] text-xs text-dim">
            Race data from the open Jolpica API, the community successor to Ergast.
            Not affiliated with Formula 1.
          </p>
        </div>
      </div>

      <div className="shell flex flex-wrap justify-between gap-3 border-t border-line py-4 text-xs text-dim">
        <span>Built with React, Redux Toolkit, React Router, Tailwind and Express.</span>
        <span>© {new Date().getFullYear()} F1Paddock</span>
      </div>
    </footer>
  )
}
