"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { toast } from "sonner";

export default function ManageSubscriptionButton({ label }: { label: string }) {
  const locale = useLocale();
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    try {
      setLoading(true);
      const response = await fetch("/api/subscription/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const result = await response.json();
      if (result.code !== 0 || !result.data?.url) {
        throw new Error(result.message || "Unable to open subscription management");
      }
      window.location.assign(result.data.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to open subscription management");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={openPortal}
      disabled={loading}
      className="mb-4 rounded-md border border-white/20 px-4 py-2 text-sm transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
    >
      {loading ? `${label}…` : label}
    </button>
  );
}
