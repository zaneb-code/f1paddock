import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'

import Splash from './components/layout/Splash'
import ErrorBoundary from './components/layout/ErrorBoundary'
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

 
  useEffect(() => {
    dispatch(loadSession())
  }, [dispatch])

 
  useEffect(() => {
    if (user) dispatch(loadMyProfile(user))
  }, [dispatch, user])

  return (
    <div className="flex min-h-screen flex-col">
      {}
      <Splash />

      <ScrollToTop />
      <Navbar />

      <main className="flex-1">
        {}
        <ErrorBoundary>
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
        </ErrorBoundary>
      </main>

      <Footer />
    </div>
  )
}
