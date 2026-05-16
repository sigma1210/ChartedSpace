import { checkAuth } from "@/lib/auth"
import LandingPage from "@/app/components/LandingPage"

export default async function Home() {
  await checkAuth()
  return <LandingPage />
}
