// Next.js 15 entry point. src/proxy.ts holds the logic (the Next.js 16 name).
export { proxy as middleware } from "./proxy";

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
