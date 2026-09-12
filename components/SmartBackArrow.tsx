"use client";

import { useSearchParams } from "next/navigation";
import { BackToArchiveArrow } from "./BackToArchiveArrow";

function getBackDestination(from: string | null): {
  href: string;
  ariaLabel: string;
} {
  if (from === "home") {
    return { href: "/", ariaLabel: "Back to home" };
  }

  if (from === "2d-list") {
    return { href: "/archive?view=2d-list", ariaLabel: "Back to list view" };
  }

  if (from === "3d") {
    return { href: "/archive?view=3d", ariaLabel: "Back to 3D space" };
  }

  return { href: "/archive", ariaLabel: "Back to archive" };
}

export function SmartBackArrow() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const { href, ariaLabel } = getBackDestination(from);

  return <BackToArchiveArrow href={href} ariaLabel={ariaLabel} />;
}
