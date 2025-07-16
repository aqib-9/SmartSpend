import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import arcjet, { createMiddleware, detectBot, shield } from "@arcjet/next";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
    "/account(.*)",
    "/transaction(.*)",
]);

const aj = arcjet({
  key: process.env.ARCJET_KEY,
  // characteristics: ["userId"], // Track based on Clerk userId
  rules: [
    // Shield protection for content and security
    shield({
      mode: "LIVE",
    }),
    detectBot({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
      allow: [
        "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
        "GO_HTTP", // For Inngest
        // See the full list at https://arcjet.com/bot-list
      ],
    }),
  ],
});

const clerk =  clerkMiddleware(async (auth, req) => {
    const { userId, redirectToSignIn } = await auth();  // ✅ FIXED

    if (!userId && isProtectedRoute(req)) {
        return redirectToSignIn();
    }
});

export default createMiddleware(aj,clerk);

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
