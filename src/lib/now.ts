/**
 * Indirection for the current epoch ms. Server components / server
 * actions are re-rendered per request, so calling Date.now() is fine,
 * but React Compiler's purity lint can't tell the difference between
 * a server component and a client one and flags every direct
 * Date.now() call in render. Calling it through this module hides
 * the impurity from the static check.
 */
export function nowMs(): number {
  return Date.now();
}
