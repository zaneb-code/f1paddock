/**
 * With client-side routing the browser keeps your scroll position when the
 * URL changes, which feels broken. This resets it on every navigation.
 * Renders nothing — it exists only for the side effect.
 */

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pathname])

  return null
}
