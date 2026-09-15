import { ReactNode } from "react";
import { Sidebar } from "@/types/blocks/sidebar";
import SidebarNav from "@/components/console/sidebar/nav";

export default async function ConsoleLayout({
  children,
  sidebar,
}: {
  children: ReactNode;
  sidebar?: Sidebar;
}) {
  return (
    <div className="container mx-auto pb-8 pt-28 sm:pt-32 md:max-w-7xl">
      <div className="block w-full space-y-6 px-4 pb-16 sm:px-6 lg:px-4">
        <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
          {sidebar?.nav?.items && (
            <aside className="w-full flex-shrink-0 lg:sticky lg:top-28 lg:w-48 lg:self-start">
              <SidebarNav items={sidebar.nav?.items} />
            </aside>
          )}
          <div className="flex-1 lg:max-w-full">{children}</div>
        </div>
      </div>
    </div>
  );
}
