"use client";

const AppError = ({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) => {
  return (
    <div className="starfield flex h-full items-center justify-center">
      <div className="hud-panel w-full max-w-md rounded-sm">
        <div className="hud-panel-header">Navigation Error</div>
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
    </div>
  );
}
export default AppError
