"use client"

import { useEffect } from "react"

// Dev-only page. Clears all Clerk cookies and local storage,
// then redirects to the landing page. Useful after deleting a Clerk user mid-session.
const DevResetPage = () => {
  useEffect(() => {
    document.cookie.split(";").forEach((c) => {
      document.cookie = c.trim().split("=")[0] + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/"
    })
    localStorage.clear()
    sessionStorage.clear()
    window.location.replace("/")
  }, [])

  return (
    <main className="starfield flex min-h-screen items-center justify-center">
      <p className="font-mono text-xs uppercase tracking-widest text-(--hud-text-dim) animate-pulse">
        Clearing session…
      </p>
    </main>
  )
}
export default DevResetPage
