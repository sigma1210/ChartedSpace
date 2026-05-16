"use client"

import { SignOutButton } from "@clerk/nextjs"

const DevLogoutButton = () => {
  return (
    <SignOutButton redirectUrl="/">
      <button className="border border-(--hud-error) px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-(--hud-error) hover:bg-(--hud-error) hover:text-(--hud-bg) transition-colors">
        ⚠ Dev Logout
      </button>
    </SignOutButton>
  )
}
export default DevLogoutButton
