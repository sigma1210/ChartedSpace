"use client"

import { useEffect } from "react"

const SignUpError = ({
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
      <div className="hud-panel w-full max-w-md rounded-sm">
        <div className="hud-panel-header text-(--hud-error)">Registration Error</div>
        <div className="p-6 text-center space-y-4">
          <p className="font-mono text-sm text-(--hud-error)">
            {error.message ?? "An unexpected error occurred."}
          </p>
          <button
            onClick={unstable_retry}
            className="border border-(--hud-border) px-4 py-2 font-mono text-xs uppercase tracking-wider text-(--hud-text) hover:border-(--hud-accent) transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    </main>
  )
}
export default SignUpError
