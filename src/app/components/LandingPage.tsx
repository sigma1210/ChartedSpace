import Link from "next/link"
import SignInForm from "@/app/(auth)/components/SignInForm"

const LandingPage = () => {
  return (
    <div className="starfield flex min-h-screen flex-col">
      {/* Top nav */}
      <header className="border-b border-(--hud-border) bg-(--hud-bg)/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <span className="font-mono text-sm font-bold tracking-widest text-(--hud-text) uppercase">
            ◈ Charted Space
          </span>
          <nav className="hidden gap-6 md:flex">
            {["Features", "Lore", "Terminal"].map((item) => (
              <span
                key={item}
                className="font-mono text-xs uppercase tracking-wider text-(--hud-text-dim) cursor-pointer hover:text-(--hud-text) transition-colors"
              >
                {item}
              </span>
            ))}
          </nav>
          <Link
            href="/sign-up"
            className="border border-(--hud-accent) px-4 py-1.5 font-mono text-xs uppercase tracking-wider text-(--hud-accent) hover:bg-(--hud-accent) hover:text-(--hud-bg) transition-colors"
          >
            Create Account
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="mx-auto grid w-full max-w-5xl gap-0 md:grid-cols-2 border border-(--hud-border) bg-(--hud-surface)">
          {/* Left panel — branding */}
          <div className="border-b border-(--hud-border) md:border-b-0 md:border-r p-8 flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-(--hud-accent) text-xs font-mono">◈</span>
                  <span className="font-mono text-xs uppercase tracking-widest text-(--hud-accent) border border-(--hud-accent)/40 px-2 py-0.5">
                    Encryption Active
                  </span>
                </div>
                <h1 className="font-mono text-2xl font-bold uppercase tracking-wider text-(--hud-text) leading-tight">
                  Jump Drive<br />Engaged
                </h1>
              </div>

              <div className="space-y-4">
                {[
                  { label: "Origin Node", value: "Third Imperium Core" },
                  { label: "Source Branch", value: "Charted Space v1.0" },
                  { label: "Session Token", value: "0x" + Math.random().toString(16).slice(2, 14).toUpperCase() },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="font-mono text-xs uppercase tracking-widest text-(--hud-text-dim) mb-1">
                      {label}
                    </p>
                    <p className="font-mono text-sm text-(--hud-text) border-l-2 border-(--hud-accent) pl-2">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Starmap placeholder */}
            <div className="mt-8 h-36 border border-(--hud-border) bg-(--hud-surface-2) flex items-center justify-center">
              <div className="text-center">
                <div className="font-mono text-xs text-(--hud-text-dim) uppercase tracking-widest animate-pulse">
                  ◈ Navigation Grid
                </div>
                <div className="mt-1 font-mono text-[10px] text-(--hud-border) uppercase tracking-widest">
                  Subsector data loading…
                </div>
              </div>
            </div>

            <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-(--hud-text-dim)">
              © 1105 Third Imperium Cryptography Division
            </p>
          </div>

          {/* Right panel — sign-in form */}
          <div className="p-8">
            <SignInForm />
          </div>
        </div>
      </main>
    </div>
  )
}
export default LandingPage
