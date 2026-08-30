// In dev the vite proxy puts the harness on our own origin, so a bare /api
// path is right. A deployed build has no proxy, so it needs to be told where
// the harness lives. Same-origin stays the default because TrueForge ships no
// CORS middleware, which means a cross-origin build only works if something in
// front of it (CloudFront, nginx) rewrites /api to the harness.
const origin = import.meta.env.VITE_API_ORIGIN ?? "";

export function apiUrl(path: string) {
  return `${origin}/api/v1${path}`;
}
