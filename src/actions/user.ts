"use server"

import { prisma } from "@/lib/prisma"

export const getUser = async (clerkId: string) => {
  try {
    return await prisma.user.findUnique({ where: { clerkId } })
  } catch (err) {
    console.error("[getUser]", err)
    return null
  }
}

export const createOrUpdateUser = async ({
  clerkId,
  username,
}: {
  clerkId: string
  username?: string | null
}) => {
  try {
    return await prisma.user.upsert({
      where: { clerkId },
      create: { clerkId, username },
      update: { username },
    })
  } catch (err) {
    console.error("[createOrUpdateUser]", err)
    return null
  }
}

export const deleteUser = async (clerkId: string) => {
  try {
    return await prisma.user.delete({ where: { clerkId } })
  } catch (err) {
    console.error("[deleteUser]", err)
    return null
  }
}
