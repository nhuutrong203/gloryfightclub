// Chuyển động của web public (PublicLayout nạp file này). Mọi hiệu ứng tự tắt khi người dùng bật "giảm chuyển động";
// nghiêng thẻ / nút nam châm chỉ chạy trên máy có chuột (điện thoại không có hover, chạm vào không bị lệch).
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

// ── Hiện dần khi cuộn tới: .reveal (khối), .reveal-title (mọi h2 trong <main>) ──
document.querySelectorAll<HTMLElement>('main h2').forEach((h) => {
  if (!h.closest('.reveal, dialog, [data-no-reveal]')) h.classList.add('reveal-title');
});
const pending = new Set<HTMLElement>();
const show = (el: HTMLElement) => {
  if (!pending.delete(el)) return;
  io.unobserve(el);
  el.classList.add('is-in');
  // Hết lượt hiện thì bỏ độ trễ lần lượt, để hiệu ứng rê chuột sau đó không bị chậm theo thứ tự thẻ.
  setTimeout(() => el.style.setProperty('--i', '0'), 1300);
};
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) show(e.target as HTMLElement);
}, { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll<HTMLElement>('.reveal, .reveal-title').forEach((el) => { pending.add(el); io.observe(el); });
// Vuốt thật nhanh / bấm link #neo có thể nhảy qua cả khối giữa hai khung hình (observer không kịp thấy):
// cuộn xong thì hiện luôn mọi khối đã ở phía trên mép dưới màn hình, không để khối nào tàng hình.
let settle = 0;
addEventListener('scroll', () => {
  clearTimeout(settle);
  settle = window.setTimeout(() => { for (const el of pending) if (el.getBoundingClientRect().top < innerHeight) show(el); }, 150);
}, { passive: true });

// ── Header: đậm hơn khi đã cuộn; cuộn xuống thì ẩn, cuộn lên thì hiện. Dải chữ chạy nhanh / đảo chiều theo cú cuộn. ──
const header = document.getElementById('site-header');
const nav = document.getElementById('mnav') as HTMLDetailsElement | null;
const marquees = [...document.querySelectorAll<HTMLElement>('.animate-marquee')];
let lastY = scrollY;
let boost = 0; // tốc độ thêm của dải chữ, giảm dần về 0
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

// Menu mobile: đóng khi bấm link hoặc Esc; khoá cuộn trang khi mở.
nav?.addEventListener('toggle', () => { document.documentElement.style.overflow = nav.open ? 'hidden' : ''; });
nav?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => { nav.open = false; }));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav?.open) nav.open = false; });

// ── Máy có chuột: thẻ [data-tilt] nghiêng theo con trỏ + quầng sáng; nút [data-magnetic] nhích theo con trỏ;
//    quầng đỏ [data-spot] (hero) đi theo con trỏ. Con trỏ chuột để bình thường (vòng tròn đuổi theo chuột đã bỏ theo ý chủ web). ──
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
      // Kẹp ±10px / ±6px: nút rộng cả màn hình mà nhân theo tỉ lệ thì trượt quá xa khỏi chỗ bấm.
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
