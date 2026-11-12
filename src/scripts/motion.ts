// Public motion effects respect reduced motion preferences.
// Tilt and magnetic controls require a pointing device.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

// Keep the price in HTML and animate it only when visible.
if (!reduced) {
  const prices = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      prices.unobserve(entry.target);
      const el = entry.target as HTMLElement;
      const total = Number(el.dataset.countPrice);
      if (!Number.isFinite(total) || total <= 0) continue;
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / 900, 1);
        el.textContent = Math.round(total * (1 - (1 - progress) ** 3)).toLocaleString('vi-VN');
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }, { threshold: 0.25 });
  document.querySelectorAll<HTMLElement>('[data-count-price]').forEach((el) => prices.observe(el));
}

// Reveal blocks and headings as they enter the viewport.
document.querySelectorAll<HTMLElement>('main h2').forEach((h) => {
  if (!h.closest('.reveal, dialog, [data-no-reveal]')) h.classList.add('reveal-title');
});
const pending = new Set<HTMLElement>();
const show = (el: HTMLElement) => {
  if (!pending.delete(el)) return;
  io.unobserve(el);
  el.classList.add('is-in');
  // Clear stagger delays after reveal so hover effects respond immediately.
  setTimeout(() => el.style.setProperty('--i', '0'), 1300);
};
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) show(e.target as HTMLElement);
}, { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll<HTMLElement>('.reveal, .reveal-title').forEach((el) => { pending.add(el); io.observe(el); });
// A fast scroll or anchor jump can skip the observer threshold.
// Reveal any element already above the bottom of the viewport.
let settle = 0;
addEventListener('scroll', () => {
  clearTimeout(settle);
  settle = window.setTimeout(() => { for (const el of pending) if (el.getBoundingClientRect().top < innerHeight) show(el); }, 150);
}, { passive: true });

// Hide the header on downward scroll and adjust marquee speed with scrolling.
const header = document.getElementById('site-header');
const nav = document.getElementById('mnav') as HTMLDetailsElement | null;
const marquees = [...document.querySelectorAll<HTMLElement>('.animate-marquee')];
let lastY = scrollY;
let boost = 0; // Extra marquee speed that decays to zero.
let dir = 1;
let spinning = false;
const spin = () => {
  boost *= 0.92;
  if (boost < 0.02) boost = 0;
  for (const m of marquees) {
    const a = m.getAnimations()[0];
    if (a) a.playbackRate = dir * (1 + boost);
    m.style.setProperty('--skew', `${-dir * Math.min(boost, 4) * 2}deg`);
  }
  spinning = boost > 0;
  if (spinning) requestAnimationFrame(spin);
};
const onScroll = () => {
  const y = scrollY;
  const dy = y - lastY;
  header?.toggleAttribute('data-scrolled', y > 8);
  if (!reduced && !nav?.open && !header?.contains(document.activeElement)) {
    if (dy > 6 && y > 320) header?.setAttribute('data-hidden', '');
    else if (dy < -6 || y < 320) header?.removeAttribute('data-hidden');
  }
  if (!reduced && marquees.length && dy) {
    dir = dy > 0 ? 1 : -1;
    boost = Math.min(6, boost + Math.abs(dy) / 40);
    if (!spinning) { spinning = true; requestAnimationFrame(spin); }
  }
  lastY = y;
};
addEventListener('scroll', onScroll, { passive: true });
onScroll();
header?.addEventListener('focusin', () => header.removeAttribute('data-hidden'));

// Close the mobile menu on link activation or Escape and lock scroll while open.
nav?.addEventListener('toggle', () => { document.documentElement.style.overflow = nav.open ? 'hidden' : ''; });
nav?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => { nav.open = false; }));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav?.open) nav.open = false; });

// Add pointer-driven tilt, highlights, and magnetic controls.
//    Move the hero glow without changing the native cursor.
if (finePointer && !reduced) {

  let tilt: HTMLElement | null = null;
  let mag: HTMLElement | null = null;
  let ev: PointerEvent | null = null;
  let queued = false;
  const release = () => {
    if (tilt) { tilt.classList.remove('is-tilting'); tilt.style.setProperty('--rx', '0deg'); tilt.style.setProperty('--ry', '0deg'); tilt = null; }
    if (mag) { mag.style.setProperty('--tx', '0px'); mag.style.setProperty('--ty', '0px'); mag = null; }
  };
  const frame = () => {
    queued = false;
    if (!ev) return;
    const target = ev.target as Element;
    const t = target.closest<HTMLElement>('[data-tilt]');
    const m = target.closest<HTMLElement>('[data-magnetic]');
    if (t !== tilt && tilt) { tilt.classList.remove('is-tilting'); tilt.style.setProperty('--rx', '0deg'); tilt.style.setProperty('--ry', '0deg'); }
    if (m !== mag && mag) { mag.style.setProperty('--tx', '0px'); mag.style.setProperty('--ty', '0px'); }
    tilt = t; mag = m;
    if (t) {
      const r = t.getBoundingClientRect();
      const x = (ev.clientX - r.left) / r.width;
      const y = (ev.clientY - r.top) / r.height;
      t.classList.add('is-tilting');
      t.style.setProperty('--ry', `${(x - 0.5) * 8}deg`);
      t.style.setProperty('--rx', `${(0.5 - y) * 8}deg`);
      t.style.setProperty('--mx', `${x * 100}%`);
      t.style.setProperty('--my', `${y * 100}%`);
    }
    const spot = target.closest<HTMLElement>('[data-spot]');
    if (spot) {
      const r = spot.getBoundingClientRect();
      spot.style.setProperty('--sx', `${ev.clientX - r.left}px`);
      spot.style.setProperty('--sy', `${ev.clientY - r.top}px`);
    }
    if (m) {
      const r = m.getBoundingClientRect();
      // Clamp the offset so wide buttons do not move away from the pointer.
      const clamp = (v: number, max: number) => Math.max(-max, Math.min(max, v));
      m.style.setProperty('--tx', `${clamp((ev.clientX - r.left - r.width / 2) * 0.25, 10)}px`);
      m.style.setProperty('--ty', `${clamp((ev.clientY - r.top - r.height / 2) * 0.35, 6)}px`);
    }
  };
  document.addEventListener('pointermove', (e) => {
    ev = e;
    if (!queued) { queued = true; requestAnimationFrame(frame); }
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', release);
}
