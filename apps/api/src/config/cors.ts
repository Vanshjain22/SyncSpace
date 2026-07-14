import { env } from "./env";

export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }
  // Allow local development origins
  if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
    return true;
  }
  // Allow exact frontend URL matching
  if (origin === env.FRONTEND_URL) {
    return true;
  }
  // Allow all Vercel deployment domains (previews, production, branches)
  if (origin.endsWith(".vercel.app")) {
    return true;
  }
  return false;
}
