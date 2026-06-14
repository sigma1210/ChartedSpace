import { prisma } from "@/lib/prisma";

export const DEV_CLERK_ID = "dev_user_local";

export const isDevAuthMode = () =>
  process.env.DEV_MODE === "true" && process.env.NODE_ENV === "development";

export const getClerkId = async (): Promise<string | null> => {
  if (isDevAuthMode()) {
    return DEV_CLERK_ID;
  }
  const { auth } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  return userId;
};

export const getCurrentUser = async () => {
  if (isDevAuthMode()) {
    return prisma.user.upsert({
      where: { clerkId: DEV_CLERK_ID },
      create: { clerkId: DEV_CLERK_ID, username: "dev" },
      update: { username: "dev" },
    });
  }

  const clerkId = await getClerkId();
  if (!clerkId) return null;
  return prisma.user.findUnique({ where: { clerkId } });
};
