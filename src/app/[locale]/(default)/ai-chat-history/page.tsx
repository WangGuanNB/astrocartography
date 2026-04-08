"use client";

import { useEffect, useState } from "react";
import { useAppContext } from "@/contexts/app";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";

type ListItem = {
  id: string;
  title: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_synastry: boolean;
  message_count: number;
};

export default function AiChatHistoryListPage() {
  const { user, setShowSignModal } = useAppContext();
  const t = useTranslations("ai_chat_history_page");
  const tUser = useTranslations("user");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ListItem[]>([]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch("/api/ai-chat/sessions")
      .then(async (r) => {
        if (!r.ok) {
          return;
        }
        const j = await r.json();
        if (j.code === 0 && j.data?.items && !cancelled) {
          setItems(j.data.items as ListItem[]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

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

  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-2xl font-bold text-white mb-6">{t("title")}</h1>
      {loading ? (
        <p className="text-white/60">…</p>
      ) : items.length === 0 ? (
        <p className="text-white/70">{t("empty")}</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((it) => (
            <li key={it.id}>
              <Link href={`/ai-chat-history/${it.id}`}>
                <Card className="border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                  <CardContent className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                    <div className="min-w-0">
                      <div className="font-medium text-white truncate leading-tight">
                        {it.title || "Chat"}
                      </div>
                      <div className="text-xs text-white/50 mt-0.5">
                        {it.updated_at
                          ? new Date(it.updated_at).toLocaleString()
                          : ""}
                        {it.is_synastry ? " · Synastry" : ""}
                      </div>
                    </div>
                    <div className="text-xs text-purple-300 shrink-0">
                      {t("message_count", { count: it.message_count })}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
