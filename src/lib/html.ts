// Diary rich-text helpers shared by the CMS and Node tests.

// Keep allowed tags and the href on links. Unwrap unknown tags.
const KEEP = new Set(['p', 'br', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 's', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'a']);
// Drop executable, embedded, and form elements with their contents.
// Raw-text elements can expose executable HTML if their children are retained.
const DROP = new Set(['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'form', 'input', 'button', 'textarea', 'select',
  'img', 'video', 'audio', 'source', 'picture', 'canvas', 'link', 'meta', 'base', 'template', 'noscript', 'title', 'head',
  'xmp', 'noembed', 'noframes', 'plaintext']);

/** Decide whether to drop, unwrap, or retain an element. Test this logic in Node. */
export const tagAction = (tag: string): 'drop' | 'unwrap' | 'keep' => {
  const t = tag.toLowerCase();
  return DROP.has(t) ? 'drop' : KEEP.has(t) ? 'keep' : 'unwrap';
};

/** Allow only HTTP(S) links without quotes or angle brackets. */
export const safeHref = (href: string | null | undefined) => {
  const h = (href ?? '').trim();
  return /^https?:\/\/[^\s"'<>]+$/i.test(h) ? h : null;
};

/** Sanitize editor HTML using the Workers HTMLRewriter allowlist. */
export async function sanitizeHtml(html: string): Promise<string> {
  const out = await new HTMLRewriter()
    .on('*', {
      element(e) {
        const action = tagAction(e.tagName);
        if (action === 'drop') { e.remove(); return; }
        if (action === 'unwrap') { e.removeAndKeepContent(); return; }
        const href = e.tagName.toLowerCase() === 'a' ? safeHref(e.getAttribute('href')) : null;
        for (const [name] of [...(e.attributes as unknown as Iterable<[string, string]>)]) e.removeAttribute(name);
        if (href) {
          e.setAttribute('href', href);
          e.setAttribute('target', '_blank');
          e.setAttribute('rel', 'noopener nofollow');
        }
      },
    })
    .onDocument({ comments: (c) => { c.remove(); } })
    .transform(new Response(html))
    .text();
  return out.trim();
}

/** Extract plain text for SEO descriptions, excerpts, and generated titles. */
export function toText(html: string) {
  return html
    .replace(/<(br|\/p|\/div|\/h[23]|\/li|\/blockquote)\b[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Convert legacy plain text to editor HTML, with blank lines separating paragraphs. */
export function textToHtml(text: string) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return text.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
}

/** Parse numbered lines as club rule section headings.
 *  Other nonempty lines become items. Items before the first heading are untitled. */
export function policySections(text: string | null | undefined) {
  const out: { title: string | null; items: string[] }[] = [];
  for (const raw of (text ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (/^\d+\.\s/.test(line)) { out.push({ title: line, items: [] }); continue; }
    if (!out.length) out.push({ title: null, items: [] });
    out[out.length - 1].items.push(line);
  }
  return out;
}
