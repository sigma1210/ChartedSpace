export const DEV_CLERK_ID = "dev_user_local";

export const getClerkId = async (): Promise<string | null> => {
  if (process.env.DEV_MODE === "true" && process.env.NODE_ENV === "development") {
    return DEV_CLERK_ID;
  }
  const { auth } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  return userId;
};
