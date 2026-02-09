import { ReactNode, useState } from "react";

interface MainLayoutProps {
  topBar: ReactNode;
  leftSidebar: ReactNode | null;
  center: ReactNode;
  rightSidebar: ReactNode | null;
}

export default function MainLayout({
  topBar,
  leftSidebar,
  center,
  rightSidebar,
}: MainLayoutProps) {
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  const hasSidebars = leftSidebar || rightSidebar;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {topBar}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile sidebar toggles */}
        {hasSidebars && (
          <>
            {leftSidebar && (
              <button
                onClick={() => { setLeftOpen(!leftOpen); setRightOpen(false); }}
                className="md:hidden fixed bottom-4 left-4 z-40 w-10 h-10 bg-white border border-gray-300 rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:bg-gray-50"
                aria-label="Toggle agents panel"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
            {rightSidebar && (
              <button
                onClick={() => { setRightOpen(!rightOpen); setLeftOpen(false); }}
                className="md:hidden fixed bottom-4 right-4 z-40 w-10 h-10 bg-white border border-gray-300 rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:bg-gray-50"
                aria-label="Toggle feed panel"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </button>
            )}
          </>
        )}

        {/* Mobile overlay */}
        {(leftOpen || rightOpen) && (
          <div
            className="md:hidden fixed inset-0 bg-black/30 z-30"
            onClick={() => { setLeftOpen(false); setRightOpen(false); }}
          />
        )}

        {/* Left sidebar */}
        {leftSidebar && (
          <aside
            className={`
              fixed md:relative inset-y-0 left-0 z-30 md:z-auto
              transform transition-transform duration-200 ease-in-out
              ${leftOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
              w-[280px] md:w-[250px] flex-shrink-0 md:top-auto
            `}
          >
            {leftSidebar}
          </aside>
        )}

        {/* Center content */}
        <main className="flex-1 overflow-hidden bg-surface-50">
          {center}
        </main>

        {/* Right sidebar */}
        {rightSidebar && (
          <aside
            className={`
              fixed md:relative inset-y-0 right-0 z-30 md:z-auto
              transform transition-transform duration-200 ease-in-out
              ${rightOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}
              w-[300px] flex-shrink-0 md:top-auto
            `}
          >
            {rightSidebar}
          </aside>
        )}
      </div>
    </div>
  );
}
