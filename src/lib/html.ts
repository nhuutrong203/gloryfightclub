// Nội dung rich text của nhật ký lớp. Không import gì: toText/textToHtml chạy được cả ở CMS lẫn test (tests/).

// Thẻ được giữ (bỏ hết thuộc tính, trừ href của <a>). Thẻ lạ thì bỏ thẻ nhưng giữ chữ bên trong.
const KEEP = new Set(['p', 'br', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 's', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'a']);
// Thẻ bỏ cả nội dung (mã chạy được, nhúng, form…).
// xmp/noembed/noframes/plaintext: bên trong là chữ thô chưa được lọc → bỏ thẻ mà giữ ruột thì ruột thành HTML thật (XSS).
const DROP = new Set(['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'form', 'input', 'button', 'textarea', 'select',
  'img', 'video', 'audio', 'source', 'picture', 'canvas', 'link', 'meta', 'base', 'template', 'noscript', 'title', 'head',
  'xmp', 'noembed', 'noframes', 'plaintext']);

/** Quyết định cho 1 thẻ: bỏ cả nội dung / bỏ thẻ giữ chữ / giữ (không thuộc tính nào). Tách riêng để test bằng node. */
export const tagAction = (tag: string): 'drop' | 'unwrap' | 'keep' => {
  const t = tag.toLowerCase();
  return DROP.has(t) ? 'drop' : KEEP.has(t) ? 'keep' : 'unwrap';
};

/** Link được giữ: chỉ http(s), không có dấu nháy / < > (setAttribute không thoát hết ký tự → tránh chèn thuộc tính lạ). */
export const safeHref = (href: string | null | undefined) => {
  const h = (href ?? '').trim();
  return /^https?:\/\/[^\s"'<>]+$/i.test(h) ? h : null;
};

/** Lọc HTML từ trình soạn thảo theo danh sách cho phép (chạy ở Worker: dùng HTMLRewriter của Cloudflare). */
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

/** HTML → chữ thường (mô tả SEO, đoạn trích, tiêu đề tự động). */
export function toText(html: string) {
  return html
    .replace(/<(br|\/p|\/div|\/h[23]|\/li|\/blockquote)\b[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Bài cũ chữ thường → HTML để mở trong trình soạn thảo (mỗi dòng trống tách đoạn). */
export function textToHtml(text: string) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return text.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
}
