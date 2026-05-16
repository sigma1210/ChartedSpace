import { verifyWebhook } from "@clerk/nextjs/webhooks"
import { NextRequest } from "next/server"
import { createOrUpdateUser, deleteUser } from "@/actions/user"

export const POST = async (req: NextRequest) => {
  try {
    const evt = await verifyWebhook(req)

    switch (evt.type) {
      case "user.created":
      case "user.updated": {
        const { id, username } = evt.data
        await createOrUpdateUser({ clerkId: id, username: username ?? null })
        break
      }

      case "user.deleted": {
        const { id } = evt.data
        if (id) await deleteUser(id)
        break
      }
    }

    return new Response("OK", { status: 200 })
  } catch (err) {
    console.error("[webhook/clerk]", err)
    return new Response("Webhook verification failed", { status: 400 })
  }
}
