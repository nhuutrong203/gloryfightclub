declare namespace App {
  interface Locals {
    lang: import('./i18n').Lang;
    /** Shared site data loaded by middleware for public pages. */
    site: Awaited<ReturnType<typeof import('./lib/site').getSite>>;
  }
}
