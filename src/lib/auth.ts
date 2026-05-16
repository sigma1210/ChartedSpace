import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export async function checkAuth(): Promise<void> {
  const { userId } = await auth()
  if (userId) redirect("/map")
}
