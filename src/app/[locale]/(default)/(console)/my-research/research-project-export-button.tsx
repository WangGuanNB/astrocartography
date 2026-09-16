"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ResearchProject } from "@/types/research-project";

export default function ResearchProjectExportButton({
  project,
  label,
}: {
  project: ResearchProject;
  label: string;
}) {
  function downloadProject() {
    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `astrocartography-research-${project.planDate}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Button type="button" variant="outline" onClick={downloadProject}>
      <Download className="mr-2 size-4" />
      {label}
    </Button>
  );
}
