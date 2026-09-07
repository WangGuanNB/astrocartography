import Image from "next/image";
import type { HouseGuideProseSection } from "@/types/pages/house-guide";

export default function GuideProse({ section }: { section: HouseGuideProseSection }) {
  if (!section?.paragraphs?.length) return null;

  return (
    <section id={section.id} className="scroll-mt-28 py-10 lg:py-14">
      {section.label && (
        <span className="mb-4 inline-flex rounded-full border border-primary/15 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          {section.label}
        </span>
      )}
      <h2 className="mb-6 text-[1.7rem] font-bold leading-tight text-white md:text-3xl lg:text-[2.35rem]">
        {section.title}
      </h2>

      {section.image?.src && (
        <div className="relative mb-8 aspect-[16/9] overflow-hidden rounded-2xl border border-white/10 shadow-xl shadow-black/20">
          <Image
            src={section.image.src}
            alt={section.image.alt || section.title}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 720px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      )}

      <div className="space-y-5">
        {section.paragraphs.map((paragraph, index) => (
          <p
            key={index}
            className={`text-base leading-8 md:text-[1.05rem] md:leading-8 ${
              index === 0 ? "text-white/85" : "text-muted-foreground"
            }`}
          >
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
