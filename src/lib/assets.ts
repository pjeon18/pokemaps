/**
 * Base-path-safe public asset URLs. GitHub Pages serves the app under
 * /wheremon/, dev serves under /. Every reference to a file in public/
 * MUST go through this helper — never hard-code "/assets/...".
 */
export function asset(path: string): string {
  const base = import.meta.env.BASE_URL;
  return base.replace(/\/$/, "") + "/" + path.replace(/^\//, "");
}
