import { useId, useLayoutEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  applyTyping,
  caretInDisplay,
  displayToEdit,
  editToDisplay,
  editToNumber,
  formatBillionWords,
  formatNumber,
  formatVndWords,
  magnitudeWarning,
} from '@/utils/numberFormat';
import type { MoneyKind } from '@/utils/numberFormat';

interface NumberInputProps {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  id?: string;
  name?: string;
  // Digits after the decimal comma; 0 = whole numbers only.
  decimals?: number;
  // Suffix label inside the field: "₫", "tỷ", "m²", "phòng".
  unit?: string;
  // Hard cap while typing: a keystroke that would exceed it is ignored.
  max?: number;
  // Applied when the field loses focus (a smaller value is raised to it). Values are never negative.
  min?: number;
  // 'vnd' / 'billion' add the "= 3,5 tỷ đồng" reading and the suspicious-size warning; 'area' only the warning.
  kind?: MoneyKind;
  // Show a stored 0 as an empty field ("not set"), as prices do. Clearing the field emits null either way.
  zeroAsEmpty?: boolean;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  // Class of the outer element (e.g. flex-1 inside a row).
  wrapperClassName?: string;
}

const BASE_CLASS =
  'w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500 disabled:bg-slate-50 disabled:text-slate-400';

// Text field that shows numbers the Vietnamese way while the user types (3500000000 -> 3.500.000.000, decimal comma)
// and reports a real number (null when empty) through onChange, never a formatted string.
export function NumberInput({
  value,
  onChange,
  id,
  name,
  decimals = 0,
  unit,
  max,
  min,
  kind,
  zeroAsEmpty,
  placeholder,
  required,
  disabled,
  ariaLabel,
  className,
  wrapperClassName,
}: NumberInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);
  const current = value ?? null;
  const shown = (v: number | null) => (zeroAsEmpty && v === 0 ? '' : formatNumber(v, decimals));
  const [text, setText] = useState(() => shown(current));
  const [seen, setSeen] = useState<number | null>(current);

  // A value that changed from outside (loading another record, "Khôi phục") replaces the text; our own echo does not.
  if (current !== seen) {
    setSeen(current);
    const typed = editToNumber(displayToEdit(text));
    // A parent that stores "empty" as 0 echoes 0 for an empty field: keep it empty.
    if (typed !== current && !(current === 0 && typed === null)) setText(shown(current));
  }

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (pendingCaret.current !== null && input && document.activeElement === input) {
      input.setSelectionRange(pendingCaret.current, pendingCaret.current);
    }
    pendingCaret.current = null;
  }, [text]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const caret = input.selectionStart ?? input.value.length;
    const result = applyTyping(text, input.value, caret, decimals, max);
    if (!result) {
      const back = Math.max(0, caret - (input.value.length - text.length));
      input.value = text;
      input.setSelectionRange(back, back);
      return;
    }
    const display = editToDisplay(result.edit);
    const position = caretInDisplay(display, result.caret);
    // Set the DOM value ourselves so the caret survives even when the text did not change (an ignored ".").
    input.value = display;
    input.setSelectionRange(position, position);
    pendingCaret.current = position;
    setText(display);
    const next = editToNumber(result.edit);
    setSeen(next);
    onChange(next);
  };

  const handleBlur = () => {
    let next = editToNumber(displayToEdit(text));
    if (next !== null && min !== undefined && next < min) {
      next = min;
      setSeen(next);
      onChange(next);
    }
    setText(shown(next));
  };

  const numeric = editToNumber(displayToEdit(text));
  const words = kind === 'vnd' ? formatVndWords(numeric ?? 0) : kind === 'billion' ? formatBillionWords(numeric ?? 0) : '';
  const warning = kind ? magnitudeWarning(kind, numeric) : null;
  const hintId = `${inputId}-hint`;

  return (
    <div className={wrapperClassName}>
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-describedby={words || warning ? hintId : undefined}
          className={`${className ?? BASE_CLASS} font-mono ${unit ? 'pr-12' : ''}`}
        />
        {unit && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] font-semibold text-slate-400">
            {unit}
          </span>
        )}
      </div>
      {(words || warning) && (
        <div id={hintId} className="mt-1 space-y-1">
          {words && <p className="text-[11px] font-medium text-slate-500">= {words}</p>}
          {warning && (
            <p role="status" className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
              {warning}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
