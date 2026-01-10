"use client";

import { useEffect } from "react";
import clarity from "@microsoft/clarity";

export default function Clarity() {
  useEffect(() => {
    // 只在生产环境加载 Clarity
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
    if (!projectId) {
      return;
    }

    // 初始化 Microsoft Clarity
    clarity.init(projectId);
  }, []);

  // Clarity 不需要返回任何 JSX，它通过脚本注入工作
  return null;
}



















