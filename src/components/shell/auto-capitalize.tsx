"use client";

import { useEffect } from "react";

const TEXT_TYPES = new Set(["text", "search", ""]);

function wantsCapital(el: Element): el is HTMLInputElement | HTMLTextAreaElement {
  if (el instanceof HTMLTextAreaElement) return el.autocapitalize !== "off" && el.autocapitalize !== "none";
  if (!(el instanceof HTMLInputElement)) return false;
  if (!TEXT_TYPES.has(el.type)) return false;
  if (el.autocapitalize === "off" || el.autocapitalize === "none") return false;
  const mode = el.inputMode;
  return mode !== "url" && mode !== "email" && mode !== "numeric" && mode !== "decimal";
}

/**
 * Whatever anyone types into a text box starts with a capital letter, on the
 * exec desk and the delegate pages alike. A document-level listener in the
 * capture phase edits the value before React's onChange reads it, so both
 * plain forms and react-hook-form fields see the capitalised text. Usernames,
 * links, emails and passwords are left alone.
 */
export function AutoCapitalize() {
  useEffect(() => {
    const onInput = (e: Event) => {
      const el = e.target;
      if (!(el instanceof Element) || !wantsCapital(el)) return;
      const value = el.value;
      const i = value.search(/\S/);
      if (i < 0) return;
      const first = value[i]!;
      const upper = first.toUpperCase();
      if (first === upper) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      el.value = value.slice(0, i) + upper + value.slice(i + 1);
      if (start !== null && end !== null) el.setSelectionRange(start, end);
    };
    document.addEventListener("input", onInput, true);
    return () => document.removeEventListener("input", onInput, true);
  }, []);
  return null;
}
