"use client";

import Image from "next/image";
import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

interface ImageLightboxProps {
  dialogId?: string;
  isOpen: boolean;
  onClose: () => void;
  ariaLabel: string;
  imageSrc?: string | null;
  imageAlt: string;
  imageSizes: string;
  priority?: boolean;
  overlayClassName: string;
  dialogClassName?: string;
  frameClassName: string;
  frameStyle?: CSSProperties;
  contentClassName?: string;
  imageClassName?: string;
  closeButtonClassName: string;
  closeButtonLabel?: string;
  onAfterCloseFocus?: () => void;
  children?: ReactNode;
}

export function ImageLightbox({
  dialogId,
  isOpen,
  onClose,
  ariaLabel,
  imageSrc,
  imageAlt,
  imageSizes,
  priority = false,
  overlayClassName,
  dialogClassName,
  frameClassName,
  frameStyle,
  contentClassName,
  imageClassName,
  closeButtonClassName,
  closeButtonLabel = "Close",
  onAfterCloseFocus,
  children,
}: ImageLightboxProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      if (wasOpenRef.current) {
        onAfterCloseFocus?.();
      }
      wasOpenRef.current = false;
      return;
    }

    wasOpenRef.current = true;

    const previousOverflow = document.body.style.overflow;
    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen, onAfterCloseFocus, onClose]);

  if (!isOpen) {
    return null;
  }

  const media = imageSrc ? (
    <Image
      src={imageSrc}
      alt={imageAlt}
      fill
      sizes={imageSizes}
      className={imageClassName}
      priority={priority}
    />
  ) : (
    children
  );

  return (
    <div
      id={dialogId}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className={overlayClassName}
      onClick={onClose}
    >
      <button
        ref={closeButtonRef}
        type="button"
        className={closeButtonClassName}
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      >
        {closeButtonLabel}
      </button>

      <div
        className={dialogClassName}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className={frameClassName} style={frameStyle}>
          {contentClassName ? (
            <div className={contentClassName}>{media}</div>
          ) : (
            media
          )}
        </div>
      </div>
    </div>
  );
}
