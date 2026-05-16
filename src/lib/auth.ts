import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export const checkAuth = async (): Promise<void> => {
  const { userId } = await auth()
  if (userId) redirect("/map")
}
