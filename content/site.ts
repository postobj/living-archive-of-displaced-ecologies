/**
 * Site identity configuration.
 *
 * This file is CONTENT: the name, contact details, and external service URLs
 * for the archive this deployment serves. Replace these values with your
 * archive's own. Empty strings disable the related UI (e.g. no Instagram
 * link; the verify page renders a "not configured" notice).
 *
 * Environment variables still take precedence where noted, so a deployment
 * can override values without editing this file.
 */
export const SITE_CONFIG = {
  siteName: "Living Archive of Displaced Ecologies",
  /** Used as the HTML meta description. */
  siteDescription:
    "A community story archive built on the open-source Echoes from Afar platform — a non-linear, decentralized digital archive with interactive 3D storytelling.",
  /** Short tagline shown beneath navigation views. */
  siteTagline:
    "A space where stories remain fluid, revisitable, and in circulation.",
  /** Recipient for the about-page contact form. Overridden by NEXT_PUBLIC_CONTACT_EMAIL. */
  contactEmail: "",
  /** Instagram profile linked from the about page. Empty string hides the link. */
  instagramUrl: "",
  /** OTP verification worker endpoint. Overridden by NEXT_PUBLIC_VERIFY_WORKER_URL. */
  verifyWorkerUrl: "",
  /** Baserow story-update form. Overridden by NEXT_PUBLIC_STORY_UPDATE_FORM_URL. */
  storyUpdateFormUrl: "",
} as const;
