export { default } from "next-auth/middleware";

// Protect the app's authenticated areas. The cron route is protected
// separately via CRON_SECRET, and auth/login routes must stay public.
export const config = {
  matcher: [
    "/",
    "/saved/:path*",
    "/settings/:path*",
    "/cv/:path*",
    "/api/cv/:path*",
  ],
};
