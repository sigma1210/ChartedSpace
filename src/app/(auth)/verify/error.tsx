"use client"

import { useEffect } from "react"
import Link from "next/link"

const VerifyError = ({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) => {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="starfield flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="hud-panel rounded-sm">
          <div className="hud-panel-header text-(--hud-error)">Authentication Failed</div>
          <div className="p-6 space-y-4">
            <p className="font-mono text-sm text-(--hud-text)">
              Something went wrong while signing you in.
            </p>
            <p className="font-mono text-xs text-(--hud-text-dim)">
              Please try again.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={unstable_retry}
                className="flex-1 border border-(--hud-border) py-2 font-mono text-xs uppercase tracking-wider text-(--hud-text) hover:border-(--hud-accent) transition-colors"
              >
                Retry
              </button>
              <Link
                href="/"
                className="flex-1 border border-(--hud-border) py-2 font-mono text-xs uppercase tracking-wider text-(--hud-text-dim) hover:border-(--hud-accent) hover:text-(--hud-text) transition-colors text-center"
              >
                Return to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
export default VerifyError
