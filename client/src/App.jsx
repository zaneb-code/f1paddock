/**
 * ============================================================
 *  App — routing
 * ============================================================
 *
 *   /                   Dashboard       personalised F1 dashboard
 *   /races              Races           full season calendar
 *   /races/:round       RaceDetail      weekend schedule, results, discussion
 *   /standings          Standings       both championship tables
 *   /communities        Communities     browse and create
 *   /communities/:slug  CommunityDetail one community's feed
 *   /predictions        Predictions     PROTECTED — your picks + the AI's
 *   /leaderboard        Leaderboard     prediction scores
 *   /meetups            Meetups         create and join
 *   /fans               Fans            similar-interest matching
 *   /fans/:username     FanProfile      a fan's public profile
 *   /profile            Profile         PROTECTED — your favourites
 *   /admin              Admin           MODERATORS ONLY
 *   /login /register    auth            LOGGED-OUT ONLY
 *   *                   NotFound
 */

import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'

import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import ScrollToTop from './components/layout/ScrollToTop'
import { ProtectedRoute, PublicOnlyRoute, ModeratorRoute } from './routes/guards'

import Dashboard from './pages/Dashboard'
import Races from './pages/Races'
import RaceDetail from './pages/RaceDetail'
import Standings from './pages/Standings'
import Communities from './pages/Communities'
import CommunityDetail from './pages/CommunityDetail'
import Predictions from './pages/Predictions'
import Leaderboard from './pages/Leaderboard'
import Meetups from './pages/Meetups'
import Fans from './pages/Fans'
import FanProfile from './pages/FanProfile'
import Profile from './pages/Profile'
import Admin from './pages/Admin'
import Login from './pages/Login'
import Register from './pages/Register'
import NotFound from './pages/NotFound'

import { loadSession, selectUser } from './store/slices/authSlice'
import { loadMyProfile } from './store/slices/profileSlice'

export default function App() {
  const dispatch = useDispatch()
  const user = useSelector(selectUser)

  // On first load, ask the server whether the stored JWT is still valid.
  useEffect(() => {
    dispatch(loadSession())
  }, [dispatch])

  // Once we know who is signed in, make sure their F1 profile row exists.
  useEffect(() => {
    if (user) dispatch(loadMyProfile(user))
  }, [dispatch, user])

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Navbar />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/races" element={<Races />} />
          <Route path="/races/:round" element={<RaceDetail />} />
          <Route path="/standings" element={<Standings />} />
          <Route path="/communities" element={<Communities />} />
          <Route path="/communities/:slug" element={<CommunityDetail />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/meetups" element={<Meetups />} />
          <Route path="/fans" element={<Fans />} />
          <Route path="/fans/:username" element={<FanProfile />} />

          <Route
            path="/predictions"
            element={
              <ProtectedRoute>
                <Predictions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ModeratorRoute>
                <Admin />
              </ModeratorRoute>
            }
          />

          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <Register />
              </PublicOnlyRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
    </div>
  )
}
