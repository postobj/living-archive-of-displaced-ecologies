import Link from "next/link";
import { BackArrowIcon } from "./BackArrowIcon";

interface BackToArchiveArrowProps {
  className?: string;
  href?: string;
  ariaLabel?: string;
}

export function BackToArchiveArrow({
  className = "",
  href = "/archive",
  ariaLabel = "Back to archive",
}: BackToArchiveArrowProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={`site-back-link rounded-sm text-[var(--back-arrow-default)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--page-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] ${className}`}
    >
      <BackArrowIcon />
      <span className="sr-only">{ariaLabel}</span>
    </Link>
  );
}
