import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="starfield flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-mono text-3xl font-bold tracking-widest text-(--hud-text) uppercase">
            ◈ Charted Space
          </h1>
          <p className="mt-2 text-sm tracking-wider text-(--hud-text-dim) uppercase">
            Create Your Account
          </p>
        </div>

        <div className="hud-panel rounded-sm">
          <div className="hud-panel-header">Register</div>
          <div className="flex justify-center p-6">
            <SignUp
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "bg-transparent shadow-none border-0 p-0",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  socialButtonsBlockButton:
                    "border border-(--hud-border) bg-(--hud-surface-2) text-(--hud-text) hover:bg-(--hud-border) transition-colors",
                  formFieldLabel:
                    "text-(--hud-text-dim) text-xs uppercase tracking-wider",
                  formFieldInput:
                    "bg-(--hud-surface-2) border-(--hud-border) text-(--hud-text) placeholder:text-(--hud-text-dim) focus:border-(--hud-accent)",
                  formButtonPrimary:
                    "bg-(--hud-accent) text-(--hud-bg) hover:opacity-90 uppercase tracking-wider text-xs font-semibold",
                  footerActionText: "text-(--hud-text-dim) text-xs",
                  footerActionLink:
                    "text-(--hud-accent) hover:text-(--hud-text)",
                  dividerText: "text-(--hud-text-dim) text-xs",
                  dividerLine: "bg-(--hud-border)",
                  alertText: "text-(--hud-error) text-xs",
                },
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
