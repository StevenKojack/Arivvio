"use client";
import { useEffect, useRef, type ReactNode } from "react";
export function CustomerDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  return <dialog ref={dialog} aria-label={title} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }} className="customer-dialog ui-surface ui-text">
    <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b ui-border ui-surface p-4"><h2 className="font-semibold">{title}</h2><button className="hub-button" type="button" onClick={onClose}>Close</button></div><div className="p-4 sm:p-6">{children}</div>
  </dialog>;
}
