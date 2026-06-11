"use client";

import { useEffect, useRef, useState } from "react";

interface MontoInputProps {
  value: string;
  onChange: (raw: string) => void;
  decimales: number;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function MontoInput({ value, onChange, decimales, className, placeholder, disabled }: MontoInputProps) {
  const [display, setDisplay] = useState("");
  const focused = useRef(false);

  function fmtDisplay(raw: string) {
    const n = parseFloat(raw);
    if (isNaN(n)) return "";
    return n.toLocaleString("es-CO", {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    });
  }

  useEffect(() => {
    if (!focused.current) {
      setDisplay(value ? fmtDisplay(value) : "");
    }
  }, [value, decimales]);

  function handleFocus() {
    focused.current = true;
    setDisplay(value);
  }

  function handleBlur() {
    focused.current = false;
    const n = parseFloat(display);
    if (!isNaN(n) && n >= 0) {
      const raw = decimales > 0 ? n.toFixed(decimales) : String(Math.round(n));
      onChange(raw);
      setDisplay(fmtDisplay(raw));
    } else {
      onChange("");
      setDisplay("");
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let raw = e.target.value.replace(/[^0-9.]/g, "");
    const parts = raw.split(".");
    if (parts.length > 2) {
      raw = parts[0] + "." + parts.slice(1).join("");
    }
    if (decimales === 0) {
      raw = parts[0];
    } else if (parts.length === 2) {
      raw = parts[0] + "." + parts[1].slice(0, decimales);
    }
    setDisplay(raw);
    onChange(raw);
  }

  const ph = placeholder ?? (decimales > 0 ? "0." + "0".repeat(decimales) : "0");

  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      disabled={disabled}
      placeholder={ph}
      className={className}
    />
  );
}
