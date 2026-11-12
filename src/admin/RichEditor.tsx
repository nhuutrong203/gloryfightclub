import { useEffect, useId, useRef, useState } from 'react';
import { Field } from './ui';

// The diary editor uses contentEditable and execCommand.
// shortcut: execCommand is deprecated; replace it if supported browsers remove it.
// The server sanitizes draft HTML with the allowlist in src/lib/html.ts.

type Tool = { label: string; title: string; run: () => void; state?: string; cls?: string };

export function RichEditor({ label, value, onChange, placeholder, help }: { label: string; value: string; onChange: (html: string) => void; placeholder?: string; help?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const [active, setActive] = useState<Record<string, boolean | string>>({});

  // Set innerHTML only when the value changes outside the editor.
  useEffect(() => { const el = ref.current; if (el && el.innerHTML !== value) el.innerHTML = value; }, [value]);

  // Match toolbar state to the current selection.
  useEffect(() => {
    const update = () => {
      if (!ref.current?.contains(document.getSelection()?.anchorNode ?? null)) return;
      setActive({
        bold: document.queryCommandState('bold'), italic: document.queryCommandState('italic'), underline: document.queryCommandState('underline'),
        ul: document.queryCommandState('insertUnorderedList'), ol: document.queryCommandState('insertOrderedList'),
        block: String(document.queryCommandValue('formatBlock')).toLowerCase(),
      });
    };
    document.addEventListener('selectionchange', update);
    return () => document.removeEventListener('selectionchange', update);
  }, []);

  const emit = () => { const html = ref.current!.innerHTML; onChange(html === '<br>' ? '' : html); };
  const exec = (cmd: string, arg?: string) => { ref.current!.focus(); document.execCommand(cmd, false, arg); emit(); };
  const block = (tag: string) => exec('formatBlock', active.block === tag ? 'p' : tag);
  const link = () => {
    const url = window.prompt('Dán link (bắt đầu bằng https://)')?.trim();
    if (!url) return;
    if (!/^https?:\/\/\S+$/i.test(url)) return window.alert('Link phải bắt đầu bằng https://');
    const sel = document.getSelection();
    if (sel && !sel.isCollapsed && ref.current!.contains(sel.anchorNode)) exec('createLink', url);
    else exec('insertHTML', `<a href="${url.replace(/"/g, '%22')}">${url.replace(/</g, '&lt;')}</a>&nbsp;`);
  };

  const tools: Tool[] = [
    { label: 'B', title: 'Chữ đậm', run: () => exec('bold'), state: 'bold', cls: 'font-bold' },
    { label: 'I', title: 'Chữ nghiêng', run: () => exec('italic'), state: 'italic', cls: 'italic font-serif' },
    { label: 'U', title: 'Gạch chân', run: () => exec('underline'), state: 'underline', cls: 'underline' },
    { label: 'Tiêu đề', title: 'Tiêu đề lớn', run: () => block('h2'), state: 'h2' },
    { label: 'Tiêu đề nhỏ', title: 'Tiêu đề nhỏ', run: () => block('h3'), state: 'h3' },
    { label: '• Danh sách', title: 'Danh sách chấm', run: () => exec('insertUnorderedList'), state: 'ul' },
    { label: '1. Danh sách', title: 'Danh sách số', run: () => exec('insertOrderedList'), state: 'ol' },
    { label: '“ Trích dẫn', title: 'Trích dẫn (lời HLV, câu nói hay)', run: () => block('blockquote'), state: 'blockquote' },
    { label: 'Link', title: 'Chèn link', run: link },
    { label: 'Xoá kiểu', title: 'Bỏ định dạng đoạn đang chọn', run: () => { exec('removeFormat'); exec('formatBlock', 'p'); } },
  ];
  const on = (t: Tool) => !!t.state && (active[t.state] === true || active.block === t.state);

  return (
    <Field label={label} help={help}>
      <div className="border border-neutral-300 bg-white focus-within:border-ink focus-within:ring-2 focus-within:ring-ink/20">
        <div className="flex gap-1 overflow-x-auto border-b border-neutral-200 bg-neutral-50 p-1" role="toolbar" aria-label={`Định dạng: ${label}`}>
          {tools.map((t) => (
            <button key={t.title} type="button" title={t.title} aria-label={t.title} aria-pressed={t.state ? on(t) : undefined}
              onMouseDown={(e) => e.preventDefault() /* Keep the editor selection */} onClick={t.run}
              className={`min-h-11 min-w-11 shrink-0 whitespace-nowrap px-2.5 text-sm cursor-pointer transition-colors duration-150 ${on(t) ? 'bg-ink text-white' : 'hover:bg-neutral-200'} ${t.cls ?? 'font-semibold'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div ref={ref} id={id} role="textbox" aria-multiline="true" aria-label={label} contentEditable suppressContentEditableWarning
          data-placeholder={placeholder}
          onFocus={() => document.execCommand('defaultParagraphSeparator', false, 'p')}
          onInput={emit}
          // Paste plain text to remove foreign formatting while preserving emoji.
          onPaste={(e) => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); emit(); }}
          className="min-h-56 px-3 py-2.5 text-base leading-relaxed text-ink outline-none empty:before:pointer-events-none empty:before:text-neutral-400 empty:before:content-[attr(data-placeholder)]
            [&_a]:text-red-700 [&_a]:underline [&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-glory [&_blockquote]:pl-3 [&_blockquote]:italic
            [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:text-xl [&_h3]:font-bold
            [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6" />
      </div>
    </Field>
  );
}
