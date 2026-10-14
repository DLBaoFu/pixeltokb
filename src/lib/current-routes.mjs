/**
 * R1 routes remain in every build. Later-version routes enter the static build
 * one at a time only after their implementation is explicitly marked current.
 * @param {{firstRelease?: string, currentBuild?: boolean}} route
 */
export function includedInCurrentBuild(route) {
  return route.firstRelease === 'R1' || route.currentBuild === true;
}
