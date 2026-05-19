import { redirect } from "next/navigation";
import { getClerkId } from "./devAuth";

export const checkAuth = async (): Promise<void> => {
  const clerkId = await getClerkId();
  if (clerkId) redirect("/map");
};
