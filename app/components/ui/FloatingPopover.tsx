"use client";

import type { CSSProperties, ReactNode, RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type FloatingPopoverProps = {
  children: ReactNode;
  className?: string;
  isOpen: boolean;
  label: string;
  maxHeight?: number;
  preferredHeight?: number;
  width?: number;
  triggerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
};

type PopoverPosition = {
  left: number;
  maxHeight: number;
  top: number;
  width: number;
};

export function FloatingPopover({
  children,
  className = "",
  isOpen,
  label,
  maxHeight = 640,
  preferredHeight = 420,
  triggerRef,
  width = 720,
  onClose,
}: FloatingPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [position, setPosition] = useState<PopoverPosition | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function updatePosition() {
      const trigger = triggerRef.current;

      if (!trigger) {
        return;
      }

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const nextIsMobile = viewportWidth < 640;
      setIsMobile(nextIsMobile);

      if (nextIsMobile) {
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const nextWidth = Math.min(width, viewportWidth - 32);
      const measuredHeight = panelRef.current?.offsetHeight ?? preferredHeight;
      const nextHeight = Math.min(measuredHeight, maxHeight, viewportHeight - 32);
      const spaceBelow = viewportHeight - rect.bottom - 16;
      const spaceAbove = rect.top - 16;
      const shouldOpenAbove = spaceBelow < nextHeight && spaceAbove > spaceBelow;
      const top = shouldOpenAbove
        ? Math.max(16, rect.top - nextHeight - 12)
        : Math.min(rect.bottom + 12, viewportHeight - nextHeight - 16);
      const left = Math.min(
        Math.max(16, rect.left),
        Math.max(16, viewportWidth - nextWidth - 16),
      );

      setPosition({
        left,
        maxHeight: shouldOpenAbove ? spaceAbove - 12 : viewportHeight - top - 16,
        top,
        width: nextWidth,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, maxHeight, preferredHeight, triggerRef, width]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  const desktopStyle: CSSProperties | undefined =
    position && !isMobile
      ? {
          left: position.left,
          maxHeight: position.maxHeight,
          top: position.top,
          width: position.width,
        }
      : undefined;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] bg-[#0D1321]/0 sm:bg-transparent"
      onMouseDown={onClose}
    >
      <div
        ref={panelRef}
        aria-label={label}
        aria-modal="true"
        role="dialog"
        style={desktopStyle}
        onMouseDown={(event) => event.stopPropagation()}
        className={`fixed inset-x-3 bottom-3 max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[28px] border border-neutral-200 bg-white p-5 shadow-[0_34px_120px_rgba(13,19,33,0.24)] outline-none animate-[sheetIn_180ms_ease-out] sm:inset-auto sm:animate-[popoverIn_160ms_ease-out] ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
