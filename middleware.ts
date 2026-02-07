import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/studio(.*)",
  "/library(.*)",
  "/analytics(.*)",
  "/test-analysis(.*)",
  "/test-created(.*)",
  "/cbt(.*)",
  "/admin(.*)",
]);

export default clerkMiddleware((auth, request) => {
  if (isProtectedRoute(request)) {
    auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
