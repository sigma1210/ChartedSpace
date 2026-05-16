"use client"

import { useEffect } from "react"

const RootError = ({
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
      <div className="w-full max-w-md space-y-6 text-center">
        <div>
          <p className="font-mono text-2xl font-bold tracking-widest text-(--hud-text) uppercase">
            ◈ Charted Space
          </p>
          <p className="mt-1 font-mono text-xs tracking-widest text-(--hud-text-dim) uppercase">
            Traveller RPG Character Tracker
          </p>
        </div>

        <div className="hud-panel rounded-sm">
          <div className="hud-panel-header text-(--hud-error)">System Fault</div>
          <div className="p-6 space-y-4">
            <p className="font-mono text-sm text-(--hud-error)">
              {error.digest
                ? `Error ref: ${error.digest}`
                : "An unexpected error has occurred."}
            </p>
            <p className="font-mono text-xs text-(--hud-text-dim)">
              The navigation computer has encountered a critical fault.
              All crew stand by.
            </p>
            <button
              onClick={unstable_retry}
              className="w-full border border-(--hud-border) px-4 py-2 font-mono text-xs uppercase tracking-wider text-(--hud-text) hover:border-(--hud-accent) hover:text-(--hud-accent) transition-colors"
            >
              Restart Sequence
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
export default RootError
