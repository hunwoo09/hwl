// URL slug from a project title: lowercase, spaces/symbols collapsed to hyphens
export function slugify(title = '') {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Slug for a project document. Titles that slugify to nothing (untitled docs,
// non-latin-only titles) would produce a /work/ URL that matches no route, so
// fall back to the document _id.
export function projectSlug({ title, _id } = {}) {
  return slugify(title) || _id || ''
}
