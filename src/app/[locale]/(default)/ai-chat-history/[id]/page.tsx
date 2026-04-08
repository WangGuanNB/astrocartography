"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAppContext } from "@/contexts/app";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import PricingModal from "@/components/pricing/pricing-modal";
import { Pricing as PricingType } from "@/types/blocks/pricing";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

export default function AiChatHistoryDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user, setShowSignModal } = useAppContext();
  const t = useTranslations("ai_chat_history_page");
  const tUser = useTranslations("user");
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [title, setTitle] = useState<string>("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [showProGateModal, setShowProGateModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [pricingData, setPricingData] = useState<PricingType | null>(null);

  const locale = (params?.locale as string) || "en";

  const fetchPricing = async (): Promise<boolean> => {
    try {
      const response = await fetch(`/api/get-pricing?locale=${locale}`);
      if (!response.ok) return false;
      const data = await response.json();
      if (data.success && data.pricing) {
        setPricingData(data.pricing);
        return true;
      }
    } catch (e) {
      console.error("fetch pricing failed:", e);
    }
    return false;
  };

  useEffect(() => {
    if (forbidden && showProGateModal && !pricingData) {
      void fetchPricing();
    }
  }, [forbidden, showProGateModal, pricingData]);

  useEffect(() => {
    if (!user || !id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/ai-chat/sessions/${id}`)
      .then(async (r) => {
        if (r.status === 403) {
          if (!cancelled) {
            setForbidden(true);
            setShowProGateModal(true);
          }
          return;
        }
        if (r.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        const j = await r.json();
        if (j.code === 0 && j.data && !cancelled) {
          setTitle(j.data.title || "Chat");
          setMessages(j.data.messages || []);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, id]);

  if (!user) {
    return (
      <div className="container max-w-2xl py-16 text-center">
        <p className="text-white/90 mb-6">{t("sign_in_prompt")}</p>
        <Button
          onClick={() => setShowSignModal(true)}
          className="bg-gradient-to-r from-purple-600 to-pink-600"
        >
          {tUser("sign_in")}
        </Button>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="container max-w-2xl py-16 text-center">
        <p className="text-white/80 mb-4">Not found.</p>
        <Button asChild variant="outline">
          <Link href="/ai-chat-history">{t("back")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-10">
      <div className="mb-6">
        <Button asChild variant="ghost" className="text-purple-300 mb-2 -ml-2">
          <Link href="/ai-chat-history">← {t("back")}</Link>
        </Button>
        <h1 className="text-xl font-bold text-white">{title}</h1>
      </div>
      {loading ? (
        <p className="text-white/60">…</p>
      ) : (
        <div className="space-y-4 rounded-xl border border-white/10 bg-black/40 p-4 max-h-[70vh] overflow-y-auto">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "text-right text-white/95 whitespace-pre-wrap"
                  : "text-left text-white/80 whitespace-pre-wrap border-l-2 border-purple-500/50 pl-3"
              }
            >
              <div className="text-[10px] uppercase tracking-wide text-white/40 mb-1">
                {m.role === "user" ? "You" : "AI"}
              </div>
              {m.content}
            </div>
          ))}
        </div>
      )}
      {forbidden && showProGateModal && (
        <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#12131a] p-5 shadow-2xl">
            <h2 className="text-lg font-semibold text-white">{t("title")}</h2>
            <p className="mt-2 text-sm text-white/80">{t("pro_required")}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
                onClick={() => setShowProGateModal(false)}
              >
                {t("close")}
              </Button>
              <Button
                className="bg-gradient-to-r from-purple-600 to-pink-600"
                onClick={async () => {
                  if (!pricingData) {
                    const ok = await fetchPricing();
                    if (!ok) {
                      toast.error("Failed to load pricing. Please try again.");
                      return;
                    }
                  }
                  setShowPricingModal(true);
                }}
              >
                {t("view_plans")}
              </Button>
            </div>
          </div>
        </div>
      )}
      {pricingData && (
        <PricingModal
          open={showPricingModal}
          onOpenChange={setShowPricingModal}
          pricing={pricingData}
          preferredProductId="professional"
        />
      )}
    </div>
  );
}
