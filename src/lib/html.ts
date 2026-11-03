// Nội dung rich text của nhật ký lớp. Không import gì: toText/textToHtml chạy được cả ở CMS lẫn test (tests/).

// Thẻ được giữ (bỏ hết thuộc tính, trừ href của <a>). Thẻ lạ thì bỏ thẻ nhưng giữ chữ bên trong.
const KEEP = new Set(['p', 'br', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 's', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'a']);
// Thẻ bỏ cả nội dung (mã chạy được, nhúng, form…).
const DROP = new Set(['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'form', 'input', 'button', 'textarea', 'select',
  'img', 'video', 'audio', 'source', 'picture', 'canvas', 'link', 'meta', 'base', 'template', 'noscript', 'title', 'head']);

/** Lọc HTML từ trình soạn thảo theo danh sách cho phép (chạy ở Worker: dùng HTMLRewriter của Cloudflare). */
export async function sanitizeHtml(html: string): Promise<string> {
  const out = await new HTMLRewriter()
    .on('*', {
      element(e) {
        const tag = e.tagName.toLowerCase();
        if (DROP.has(tag)) { e.remove(); return; }
        if (!KEEP.has(tag)) { e.removeAndKeepContent(); return; }
        const href = tag === 'a' ? (e.getAttribute('href') ?? '').trim() : '';
        for (const [name] of [...(e.attributes as unknown as Iterable<[string, string]>)]) e.removeAttribute(name);
        // Không cho dấu nháy / < > trong link: setAttribute không thoát hết ký tự, tránh chèn thuộc tính lạ.
        if (tag === 'a' && /^https?:\/\/[^\s"'<>]+$/i.test(href)) {
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
