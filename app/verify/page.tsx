"use client";

import { type FormEvent, useState } from "react";
import { HomeBackWaveButton } from "@/components/HomeBackWaveButton";
import { useGhostStampFilter } from "@/components/GhostStampFilter";
import { SITE_CONFIG } from "@/content/site";
import styles from "./verify.module.css";

const VERIFY_WORKER_URL =
  process.env.NEXT_PUBLIC_VERIFY_WORKER_URL?.trim() ||
  SITE_CONFIG.verifyWorkerUrl;

const FALLBACK_FORM_URL = SITE_CONFIG.storyUpdateFormUrl;

type Step = "email" | "code" | "done";

function isValidBaserowFormUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "baserow.io" || url.hostname === "www.baserow.io") &&
      /^\/form\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)
    );
  } catch {
    return false;
  }
}

export default function VerifyPage() {
  const { id: stampFilterId, GhostStampFilter } = useGhostStampFilter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    kind: "info" | "success" | "error";
  } | null>(null);

  const formUrlRaw = process.env.NEXT_PUBLIC_STORY_UPDATE_FORM_URL?.trim();
  const baserowFormUrl =
    formUrlRaw && isValidBaserowFormUrl(formUrlRaw)
      ? formUrlRaw
      : FALLBACK_FORM_URL;
  const isConfigured = VERIFY_WORKER_URL.length > 0;

  async function handleSendCode(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setSending(true);

    try {
      const res = await fetch(VERIFY_WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", email: email.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ text: data.message, kind: "success" });
        setStep("code");
      } else {
        setMessage({
          text: data.error ?? "Failed to send code.",
          kind: "error",
        });
      }
    } catch {
      setMessage({
        text: "Could not reach the verification service. Please try again.",
        kind: "error",
      });
    } finally {
      setSending(false);
    }
  }

  async function handleVerify(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setVerifying(true);

    try {
      const res = await fetch(VERIFY_WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          email: email.trim(),
          code: code.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        const prefilledUrl = new URL(baserowFormUrl);
        prefilledUrl.searchParams.set("prefill_submitter_email", email.trim());
        prefilledUrl.searchParams.set("prefill_verification_token", data.token);
        window.location.assign(prefilledUrl.toString());
      } else if (res.ok) {
        setMessage({ text: data.message, kind: "success" });
        setStep("done");
      } else {
        setMessage({
          text: data.error ?? "Verification failed.",
          kind: "error",
        });
      }
    } catch {
      setMessage({
        text: "Could not reach the verification service. Please try again.",
        kind: "error",
      });
    } finally {
      setVerifying(false);
    }
  }

  return (
    <main className={styles.page}>
      <GhostStampFilter />
      <HomeBackWaveButton className={styles.backButton} />
      <div className={styles.card}>
        <h1
          className={styles.title}
          style={{ filter: `url("#${stampFilterId}")` }}
        >
          Verify your email
        </h1>
        {!isConfigured && (
          <p className={styles.subtitle}>
            Story submission verification is not configured for this archive.
            Set NEXT_PUBLIC_VERIFY_WORKER_URL (or verifyWorkerUrl in
            content/site.ts) to enable it.
          </p>
        )}

        {isConfigured && (
          <p className={styles.subtitle}>
            Enter the email you plan to use for your story submission.
            We&rsquo;ll send you a one-time code to confirm it&rsquo;s really
            you.
          </p>
        )}

        {message && (
          <p
            className={`${styles.message} ${styles[`message-${message.kind}`]}`}
          >
            {message.text}
          </p>
        )}

        {isConfigured && step === "email" && (
          <form className={styles.form} onSubmit={handleSendCode}>
            <label className={styles.field} htmlFor="verify-email">
              <span className={styles.label}>Email</span>
              <input
                id="verify-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                placeholder="you@example.com"
              />
            </label>
            <button type="submit" disabled={sending} className={styles.button}>
              {sending ? "Sending..." : "Send code"}
            </button>
          </form>
        )}

        {isConfigured && step === "code" && (
          <form className={styles.form} onSubmit={handleVerify}>
            <label className={styles.field} htmlFor="verify-code">
              <span className={styles.label}>Verification code</span>
              <input
                id="verify-code"
                type="text"
                required
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className={styles.input}
                placeholder="000000"
              />
            </label>
            <button
              type="submit"
              disabled={verifying}
              className={styles.button}
            >
              {verifying ? "Verifying..." : "Verify"}
            </button>
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => {
                setStep("email");
                setMessage(null);
              }}
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
