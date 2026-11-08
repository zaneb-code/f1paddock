/**
 * Prediction leaderboard — total points per fan across scored races.
 */

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'

import { PageHeading, Loading } from '../components/ui'
import { LeaderboardTable } from '../components/predictions/PredictionPanels'
import {
  loadLeaderboard,
  selectLeaderboard,
  selectLeaderboardStatus,
} from '../store/slices/predictionsSlice'
import { selectUser } from '../store/slices/authSlice'

export default function Leaderboard() {
  const dispatch = useDispatch()

  const rows = useSelector(selectLeaderboard)
  const status = useSelector(selectLeaderboardStatus)
  const user = useSelector(selectUser)

  useEffect(() => {
    dispatch(loadLeaderboard())
  }, [dispatch])

  return (
    <div className="shell py-10">
      <PageHeading
        eyebrow="Who called it"
        title="Prediction leaderboard"
        subtitle="10 points for an exact podium placing, 4 for the right driver in the wrong slot, 5 for calling pole."
        action={
          <Link to="/predictions" className="btn btn-sm btn-primary">
            Make a prediction
          </Link>
        }
      />

      {status === 'loading' ? (
        <Loading label="Counting the points…" />
      ) : (
        <LeaderboardTable rows={rows} currentUserId={user?.id} />
      )}
    </div>
  )
}
