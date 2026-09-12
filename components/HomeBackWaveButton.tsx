import Link from "next/link";
import { BackArrowIcon } from "./BackArrowIcon";

interface HomeBackWaveButtonProps {
  href?: string;
  label?: string;
  className?: string;
}

export function HomeBackWaveButton({
  href = "/",
  label = "Back to Home",
  className = "",
}: HomeBackWaveButtonProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`site-back-link rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--page-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] ${className}`}
    >
      <BackArrowIcon />
      <span className="sr-only">{label}</span>
    </Link>
  );
}
