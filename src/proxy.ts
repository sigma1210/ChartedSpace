import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/", "/sign-up(.*)", "/verify", "/dev-reset", "/api/webhooks/clerk"]);

const DEV_BYPASS = process.env.DEV_MODE === "true" && process.env.NODE_ENV === "development";

export default clerkMiddleware(async (auth, request) => {
  if (DEV_BYPASS) return NextResponse.next();
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
