import React, { useState, useRef } from 'react';
import { parseFtIn } from '../../utils/units';

interface NumberFieldProps {
  label: string;
  value: number;
  defaultValue: number;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  onChange: (v: number) => void;
  id?: string;
  helperText?: string;
}

export function NumberField({
  label,
  value,
  defaultValue,
  unit,
  min,
  max,
  step = 1,
  placeholder,
  onChange,
  id,
  helperText,
}: NumberFieldProps) {
  const [raw, setRaw] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const changed = value !== defaultValue;
  const fieldId = id ?? label.replace(/\s+/g, '_').toLowerCase();

  const displayVal = raw !== null ? raw : (value === 0 && placeholder) ? '' : String(value);

  const commit = (s: string) => {
    const trimmed = s.trim();
    if (trimmed === '') {
      if (min !== undefined && min <= 0) {
        setError(null);
        setRaw(null);
        onChange(0);
        return;
      }
    }
    let n: number;
    if (unit === 'ft') {
      const parsed = parseFtIn(trimmed);
      if (parsed === null) {
        setError('Invalid length (e.g. 4\'-6", 4.5)');
        return;
      }
      n = parsed;
    } else {
      n = parseFloat(trimmed);
      if (isNaN(n)) {
        setError('Invalid number');
        return;
      }
    }
    if (min !== undefined && n < min) {
      setError(`Clamped to min ${min}`);
      setRaw(null);
      onChange(min);
      return;
    }
    if (max !== undefined && n > max) {
      setError(`Clamped to max ${max}`);
      setRaw(null);
      onChange(max);
      return;
    }
    setError(null);
    setRaw(null);
    onChange(n);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.round((value + step) * 1000000) / 1000000;
      onChange(Math.min(max ?? Infinity, next));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.round((value - step) * 1000000) / 1000000;
      onChange(Math.max(min ?? -Infinity, next));
    } else if (e.key === 'Enter') {
      commit(displayVal);
    }
  };

  return (
    <div className="field">
      <label className="field__label" htmlFor={fieldId}>
        {label}
        {changed && (
          <span className="field__changed-dot" title="Changed from default" aria-label="Changed from default" />
        )}
      </label>
      <div className="field__input-wrap">
        <input
          ref={inputRef}
          id={fieldId}
          className={`field__input${error ? ' field__input--error' : ''}`}
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          value={displayVal}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label={`${label}${unit ? ` in ${unit}` : ''}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-err` : undefined}
        />
        {unit && <span className="field__unit" aria-hidden="true">{unit}</span>}
      </div>
      {error ? (
        <span id={`${fieldId}-err`} className="field__error field__helper--error" role="alert">{error}</span>
      ) : helperText ? (
        <span className="field__helper">{helperText}</span>
      ) : null}
    </div>
  );
}

interface BarSelectorProps {
  label: string;
  value: number;
  defaultValue: number;
  onChange: (v: number) => void;
  id?: string;
}

export function BarSelector({ label, value, defaultValue, onChange, id }: BarSelectorProps) {
  const changed = value !== defaultValue;
  const fieldId = id ?? label.replace(/\s+/g, '_').toLowerCase();

  return (
    <div className="field">
      <label className="field__label" htmlFor={fieldId}>
        {label}
        {changed && <span className="field__changed-dot" title="Changed from default" aria-label="Changed from default" />}
      </label>
      <select
        id={fieldId}
        className="field__select"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      >
        {[3, 4, 5, 6, 7, 8].map((n) => (
          <option key={n} value={n}>#{n} ({n}/8")</option>
        ))}
      </select>
    </div>
  );
}

export interface SelectFieldOption<T extends string> {
  value: T;
  label: string;
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  defaultValue: T;
  options: SelectFieldOption<T>[];
  onChange: (v: T) => void;
  id?: string;
}

export function SelectField<T extends string>({
  label,
  value,
  defaultValue,
  options,
  onChange,
  id,
}: SelectFieldProps<T>) {
  const changed = value !== defaultValue;
  const fieldId = id ?? label.replace(/\s+/g, '_').toLowerCase();

  return (
    <div className="field">
      <label className="field__label" htmlFor={fieldId}>
        {label}
        {changed && <span className="field__changed-dot" title="Changed from default" aria-label="Changed from default" />}
      </label>
      <select
        id={fieldId}
        className="field__select"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        aria-label={label}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
