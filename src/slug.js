// URL slug from a project title: lowercase, spaces/symbols collapsed to hyphens
export function slugify(title = '') {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
