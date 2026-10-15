import { useState } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { SEO_LIMITS, splitKeywords } from '@/utils/seoFields';

interface TagInputProps {
  id: string;
  value: string[];
  onChange: (next: string[]) => void;
}

// Keyword chips: comma or Enter adds, Backspace on an empty box removes the last one.
// At most 15 keywords of 60 characters; duplicates (case-insensitive) are ignored.
export function TagInput({ id, value, onChange }: TagInputProps) {
  const [text, setText] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const addAll = (raw: string) => {
    const incoming = splitKeywords(raw);
    if (incoming.length === 0) return;
    const next = [...value];
    let message: string | null = null;
    for (const entry of incoming) {
      const keyword = Array.from(entry).slice(0, SEO_LIMITS.keywordLength).join('');
      if (keyword.length < entry.length) message = `Từ khóa dài tối đa ${SEO_LIMITS.keywordLength} ký tự, đã cắt bớt.`;
      if (next.some((k) => k.toLowerCase() === keyword.toLowerCase())) continue;
      if (next.length >= SEO_LIMITS.keywords) {
        message = `Tối đa ${SEO_LIMITS.keywords} từ khóa.`;
        break;
      }
      next.push(keyword);
    }
    setNotice(message);
    if (next.length !== value.length) onChange(next);
  };

  const commit = () => {
    addAll(text);
    setText('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && text === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (/[,\n;]/.test(pasted)) {
      e.preventDefault();
      addAll(pasted);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2 py-1.5 focus-within:ring-2 focus-within:ring-gold-500/40">
        {value.map((keyword) => (
          <span key={keyword} className="inline-flex items-center gap-1 rounded-full bg-navy-900 text-gold-400 pl-2.5 pr-1 py-0.5 text-[11px] font-semibold">
            {keyword}
            <button
              type="button"
              aria-label={`Xóa từ khóa ${keyword}`}
              onClick={() => onChange(value.filter((k) => k !== keyword))}
              className="rounded-full p-0.5 hover:bg-white/20"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={commit}
          placeholder={value.length === 0 ? 'Gõ từ khóa rồi nhấn Enter hoặc dấu phẩy' : ''}
          disabled={value.length >= SEO_LIMITS.keywords && text === ''}
          className="flex-1 min-w-[10rem] px-1 py-1 text-xs bg-transparent border-0 outline-none"
        />
      </div>
      <p className="mt-1 text-[11px] text-slate-500">
        {value.length}/{SEO_LIMITS.keywords} từ khóa, mỗi từ khóa tối đa {SEO_LIMITS.keywordLength} ký tự.
        {notice && <span className="ml-1 text-amber-600 font-semibold">{notice}</span>}
      </p>
    </div>
  );
}
