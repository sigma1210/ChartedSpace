"use client";

export default function AuthError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="starfield flex min-h-screen items-center justify-center px-4">
      <div className="hud-panel w-full max-w-md rounded-sm">
        <div className="hud-panel-header">System Error</div>
        <div className="p-6 text-center">
          <p className="font-mono text-sm text-(--hud-error)">
            {error.message ?? "An unexpected error occurred."}
          </p>
          <button
            onClick={reset}
            className="mt-4 border border-(--hud-border) px-4 py-2 text-xs uppercase tracking-wider text-(--hud-text) hover:border-(--hud-accent) transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    </main>
  );
}
