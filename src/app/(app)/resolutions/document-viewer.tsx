"use client";

import { useEffect, useRef, useState } from "react";
import type { PreviewKind } from "@/lib/resolutions";

type Props = { uploadId: string; kind: PreviewKind; fileName: string | null; docxHtml?: string | null };

/**
 * Renders a resolution inside the page: PDFs are drawn page by page with
 * pdf.js, images are shown as they are, DOCX arrives pre-converted to HTML.
 * Nothing here opens a new tab or offers a download.
 */
export function DocumentViewer({ uploadId, kind, fileName, docxHtml }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(kind === "docx" ? "ready" : "loading");
  const [pages, setPages] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (kind !== "pdf" && kind !== "image") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/resolutions/${uploadId}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { url } = (await res.json()) as { url: string };
        if (cancelled) return;
        if (kind === "image") {
          setImageUrl(url);
          setStatus("ready");
          return;
        }
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        const doc = await pdfjs.getDocument({ url }).promise;
        if (cancelled) return;
        const el = host.current;
        if (!el) return;
        el.replaceChildren();
        setPages({ done: 0, total: doc.numPages });
        setStatus("ready");
        const width = Math.max(320, el.clientWidth);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        for (let i = 1; i <= doc.numPages; i++) {
          if (cancelled) return;
          const page = await doc.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const scale = width / base.width;
          const viewport = page.getViewport({ scale: scale * dpr });
          const canvas = document.createElement("canvas");
          canvas.className = "doc-page";
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.setAttribute("aria-label", `Page ${i} of ${doc.numPages}`);
          canvas.setAttribute("role", "img");
          el.appendChild(canvas);
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          // Print intent renders through microtasks rather than requestAnimationFrame,
          // so pages keep drawing while the tab is in the background.
          await page.render({ canvasContext: ctx, canvas, viewport, intent: "print" }).promise;
          setPages({ done: i, total: doc.numPages });
        }
      } catch (err) {
        console.error("Resolution preview failed", err);
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uploadId, kind]);

  if (kind === "docx") {
    return docxHtml ? (
      <article className="doc-sheet doc-prose" dangerouslySetInnerHTML={{ __html: docxHtml }} />
    ) : (
      <div className="doc-sheet"><p className="m-0 muted">This document could not be converted for preview.</p></div>
    );
  }
  if (kind === "unknown") {
    return <div className="doc-sheet"><p className="m-0 muted">This file type cannot be previewed.</p></div>;
  }
  return (
    <div className="doc-viewer" aria-busy={status === "loading" || (pages.total > 0 && pages.done < pages.total)}>
      {status === "loading" ? <p className="doc-status">Opening {fileName ?? "the document"}…</p> : null}
      {status === "error" ? <p className="doc-status">The document could not be displayed right now. Try again in a moment.</p> : null}
      {kind === "image" && imageUrl ? (
        <img src={imageUrl} alt={fileName ?? "Resolution"} className="doc-image" draggable={false} />
      ) : null}
      {kind === "pdf" ? (
        <>
          <div ref={host} className="doc-pages" onContextMenu={(e) => e.preventDefault()} />
          {pages.total > 0 && pages.done < pages.total ? <p className="doc-status">Rendering page {pages.done + 1} of {pages.total}…</p> : null}
          {pages.total > 0 && pages.done === pages.total ? <p className="doc-status">{pages.total === 1 ? "1 page" : `${pages.total} pages`}</p> : null}
        </>
      ) : null}
    </div>
  );
}
