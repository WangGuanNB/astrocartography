"use client";

import { Avatar, AvatarImage } from "@/components/ui/avatar";

import Crumb from "./crumb";
import Markdown from "@/components/markdown";
import { Post } from "@/types/post";
import moment from "moment";
import { Card } from "@/components/ui/card";
import Link from "next/link";

const HOME_CTA: Record<string, { href: string; label: string; hint: string }> = {
  en: {
    href: "/",
    label: "Free Astrocartography Chart & Map",
    hint: "Generate your free astrocartography chart on the world map.",
  },
  zh: {
    href: "/zh",
    label: "免费星盘地图 Astrocartography Chart",
    hint: "在世界地图上生成你的免费星运地理图。",
  },
  de: {
    href: "/de",
    label: "Kostenlose Astrocartography-Karte",
    hint: "Erstelle deine kostenlose Astrocartography-Karte auf der Weltkarte.",
  },
  es: {
    href: "/es",
    label: "Carta de Astrocartografía gratis",
    hint: "Genera tu carta de astrocartografía gratis en el mapa mundial.",
  },
  it: {
    href: "/it",
    label: "Carta di Astrocartografia gratuita",
    hint: "Genera la tua carta di astrocartografia gratuita sulla mappa del mondo.",
  },
  pt: {
    href: "/pt",
    label: "Mapa de Astrocartografia grátis",
    hint: "Gere seu mapa de astrocartografia grátis no mapa-múndi.",
  },
  ms: {
    href: "/ms",
    label: "Carta Astrocartography Percuma",
    hint: "Jana carta astrocartography percuma anda pada peta dunia.",
  },
};

export default function BlogDetail({
  post,
  locale = "en",
}: {
  post: Post;
  locale?: string;
}) {
  const cta = HOME_CTA[locale] || HOME_CTA.en;

  return (
    <section className="py-16">
      <div className="container flex flex-col items-center">
        <div className="w-full max-w-4xl">
          <div className="flex justify-center">
            <Crumb post={post} />
          </div>
          <h1 className="mb-7 mt-9 max-w-3xl mx-auto text-center text-2xl font-bold md:mb-10 md:text-4xl">
            {post.title}
          </h1>
          <div className="flex items-center justify-center gap-3 text-sm md:text-base bg-background">
            {post.author_avatar_url && (
              <Avatar className="h-8 w-8 border">
                <AvatarImage
                  src={post.author_avatar_url}
                  alt={post.author_name}
                />
              </Avatar>
            )}
            <div>
              {post.author_name && (
                <span className="font-medium">{post.author_name}</span>
              )}

              <span className="ml-2 text-muted-foreground">
                on {post.created_at && moment(post.created_at).fromNow()}
              </span>
            </div>
          </div>
          <div className="relative py-8 flex justify-center">
            {post.content && (
              <Card className="w-full max-w-4xl px-4">
                <Markdown content={post.content} />
              </Card>
            )}
          </div>
          <div className="mx-auto mt-2 max-w-4xl rounded-xl border border-border/60 bg-muted/30 px-5 py-4 text-center">
            <p className="text-sm text-muted-foreground">{cta.hint}</p>
            <Link
              href={cta.href}
              className="mt-2 inline-flex text-base font-semibold text-primary hover:underline"
            >
              {cta.label} →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
