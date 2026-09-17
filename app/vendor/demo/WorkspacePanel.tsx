"use client";
import { useEffect, useRef, type ReactNode } from "react";
export function WorkspacePanel({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const node = ref.current; const previous = document.body.style.overflow; node?.showModal(); document.body.style.overflow = "hidden"; return () => { node?.close(); document.body.style.overflow = previous; }; }, []);
  return <dialog ref={ref} onCancel={onClose} aria-label={title} className="workspace-drawer"><header className="flex items-center justify-between gap-4 border-b p-5"><h2 className="text-xl font-semibold">{title}</h2><button onClick={onClose} className="hub-button">Close</button></header><div className="p-5 sm:p-6">{children}</div></dialog>;
}
