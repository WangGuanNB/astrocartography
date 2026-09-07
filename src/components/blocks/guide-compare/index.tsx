import type { HouseGuideComparisonSection } from "@/types/pages/house-guide";

export default function GuideCompare({
  section,
}: {
  section: HouseGuideComparisonSection;
}) {
  if (!section?.rows?.length) return null;

  return (
    <section id={section.id} className="scroll-mt-28 py-10 lg:py-14">
      {section.label && (
        <span className="mb-4 inline-flex rounded-full border border-primary/15 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          {section.label}
        </span>
      )}
      <h2 className="mb-4 text-[1.7rem] font-bold leading-tight text-white md:text-3xl lg:text-[2.35rem]">
        {section.title}
      </h2>
      {section.description && (
        <p className="mb-8 max-w-3xl text-base leading-8 text-muted-foreground">
          {section.description}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/50 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.04]">
                {section.columns.map((col) => (
                  <th
                    key={col}
                    className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-white/80 first:w-[26%]"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-white/5 last:border-0 odd:bg-white/[0.02]"
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={`px-5 py-4 leading-6 ${
                        cellIndex === 0
                          ? "font-semibold text-white"
                          : "text-muted-foreground"
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
