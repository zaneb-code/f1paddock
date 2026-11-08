import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="shell grid min-h-[60vh] place-items-center py-20 text-center">
      <div>
        <p className="font-display text-8xl font-bold text-accent">404</p>
        <h1 className="mt-2 mb-3 text-3xl">Off at turn one</h1>
        <p className="mx-auto mb-7 max-w-md text-muted">
          That page does not exist. Let us get you back to the pit lane.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn btn-ghost">
            Paddock
          </Link>
          <Link to="/races" className="btn btn-primary">
            Race calendar
          </Link>
        </div>
      </div>
    </div>
  )
}
