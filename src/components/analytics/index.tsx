import GoogleAnalytics from "./google-analytics";
import OpenPanelAnalytics from "./open-panel";
import Plausible from "./plausible";

export default function Analytics() {
  // 只在生产环境加载分析工具
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  return (
    <>
      <OpenPanelAnalytics />
      <GoogleAnalytics />
      <Plausible />
    </>
  );
}
