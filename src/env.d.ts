declare namespace App {
  interface Locals {
    lang: import('./i18n').Lang;
    /** Nạp ở middleware cho mọi trang public (getSite). */
    site: Awaited<ReturnType<typeof import('./lib/site').getSite>>;
  }
}
