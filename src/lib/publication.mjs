// R1 identity, policy, and editorial pages were confirmed complete by the
// operator on 2026-10-13. Next-version technical work remains outside this
// publication boundary and does not keep these pages out of the index.
export const pendingReviewPaths = new Set();

/** @param {string} pathname */
export function normalizedContentPath(pathname) {
  const withoutLocale = pathname.replace(/^\/(zh-cn|zh-tw)(?=\/|$)/, '') || '/';
  return withoutLocale.endsWith('/') ? withoutLocale : `${withoutLocale}/`;
}

/** @param {string} pathname */
export function isPendingReview(pathname) {
  return pendingReviewPaths.has(normalizedContentPath(pathname));
}
