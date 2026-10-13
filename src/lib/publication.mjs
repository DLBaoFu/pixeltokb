// Pages that remain browsable in the local prototype but are not approved for indexing.
// Remove an entry only after the matching editorial/identity acceptance evidence exists.
export const pendingReviewPaths = new Set([
  '/about/', '/contact/', '/privacy/', '/terms/', '/cookies/',
  '/editorial-policy/', '/changelog/', '/authors/editor/'
]);

/** @param {string} pathname */
export function normalizedContentPath(pathname) {
  const withoutLocale = pathname.replace(/^\/(zh-cn|zh-tw)(?=\/|$)/, '') || '/';
  return withoutLocale.endsWith('/') ? withoutLocale : `${withoutLocale}/`;
}

/** @param {string} pathname */
export function isPendingReview(pathname) {
  return pendingReviewPaths.has(normalizedContentPath(pathname));
}
