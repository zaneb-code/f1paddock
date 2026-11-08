/**
 * Both championship tables. Drivers and teams you follow are highlighted,
 * and you can follow or unfollow straight from here.
 */

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { PageHeading, Loading, ErrorState, Tabs, SectionHeading } from '../components/ui'
import { DriverStandingsTable, ConstructorStandingsTable } from '../components/f1/StandingsTable'
import { DriverChip, TeamChip } from '../components/f1/DriverChip'

import {
  fetchStandings,
  selectDriverStandings,
  selectConstructorStandings,
  selectStandingsStatus,
  selectStandingsError,
  selectStandingsRound,
  selectSeason,
} from '../store/slices/f1Slice'
import { selectUser } from '../store/slices/authSlice'
import { followEntity, selectMyProfile } from '../store/slices/profileSlice'

export default function Standings() {
  const dispatch = useDispatch()

  const season = useSelector(selectSeason)
  const drivers = useSelector(selectDriverStandings)
  const constructors = useSelector(selectConstructorStandings)
  const status = useSelector(selectStandingsStatus)
  const error = useSelector(selectStandingsError)
  const round = useSelector(selectStandingsRound)

  const user = useSelector(selectUser)
  const profile = useSelector(selectMyProfile)

  const [tab, setTab] = useState('drivers')

  useEffect(() => {
    if (status === 'idle') dispatch(fetchStandings(season))
  }, [dispatch, season, status])

  const followedDrivers = profile?.followedDrivers ?? []
  const followedTeams = profile?.followedTeams ?? []

  function toggle(kind, entityId) {
    if (!user) return
    dispatch(followEntity({ viewerId: user.id, kind, entityId }))
  }

  return (
    <div className="shell py-10">
      <PageHeading
        eyebrow={round ? `After round ${round}` : `${season} season`}
        title="Championship standings"
        subtitle="Live from the F1 API. Follow drivers and teams to highlight them here and across the site."
      />

      <Tabs
        tabs={[
          { id: 'drivers', label: 'Drivers', count: drivers.length },
          { id: 'teams', label: 'Constructors', count: constructors.length },
        ]}
        active={tab}
        onChange={setTab}
        className="mb-6"
      />

      {status === 'loading' && <Loading label="Loading standings…" />}
      {status === 'failed' && (
        <ErrorState message={error} onRetry={() => dispatch(fetchStandings(season))} />
      )}

      {status === 'succeeded' && (
        <>
          {tab === 'drivers' ? (
            <DriverStandingsTable standings={drivers} highlightDriverIds={followedDrivers} />
          ) : (
            <ConstructorStandingsTable
              standings={constructors}
              highlightTeamIds={followedTeams}
            />
          )}

          {user && (
            <section className="mt-10">
              <SectionHeading
                eyebrow="One tap to follow"
                title={tab === 'drivers' ? 'Follow drivers' : 'Follow teams'}
              />

              <div className="flex flex-wrap gap-2">
                {tab === 'drivers'
                  ? drivers.map((row) => (
                      <DriverChip
                        key={row.driver.driverId}
                        driver={row.driver}
                        constructorId={row.constructor.id}
                        selected={followedDrivers.includes(row.driver.driverId)}
                        onClick={() => toggle('driver', row.driver.driverId)}
                      />
                    ))
                  : constructors.map((row) => (
                      <TeamChip
                        key={row.constructor.id}
                        team={row.constructor}
                        selected={followedTeams.includes(row.constructor.id)}
                        onClick={() => toggle('team', row.constructor.id)}
                      />
                    ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
