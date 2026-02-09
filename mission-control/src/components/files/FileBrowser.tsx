import { useEffect, useState } from "react";
import { useFileExplorer } from "../../hooks/useFileExplorer";
import type { FileEntry } from "../../hooks/useFileExplorer";

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(ms: number): string {
  if (!ms) return "";
  return new Date(ms).toLocaleDateString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fileIcon(entry: FileEntry): JSX.Element {
  if (entry.isDirectory) {
    return (
      <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
      </svg>
    );
  }
  const ext = entry.name.split(".").pop()?.toLowerCase() ?? "";
  if (["md", "txt", "log"].includes(ext)) {
    return (
      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  }
  if (["js", "ts", "tsx", "jsx", "py", "sh", "go", "rs"].includes(ext)) {
    return (
      <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    );
  }
  if (["json", "yaml", "yml", "toml", "ini", "conf"].includes(ext)) {
    return (
      <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

export default function FileBrowser() {
  const explorer = useFileExplorer();
  const [showFileOnMobile, setShowFileOnMobile] = useState(false);

  // Load roots on mount
  useEffect(() => {
    explorer.fetchRoots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleEntryClick(entry: FileEntry) {
    if (entry.isDirectory) {
      explorer.navigateTo(entry.path);
    } else {
      explorer.readFile(entry.path);
      setShowFileOnMobile(true);
    }
  }

  // Breadcrumb segments from currentPath
  const breadcrumbs = explorer.currentPath
    ? explorer.currentPath.split("/").filter(Boolean)
    : [];

  return (
    <div className="h-full flex bg-surface-50">
      {/* File list panel */}
      <div
        className={`${
          showFileOnMobile && explorer.selectedFile ? "hidden" : "flex"
        } md:flex flex-col w-full md:w-[360px] lg:w-[400px] bg-white border-r border-gray-200 flex-shrink-0`}
      >
        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <h2 className="text-sm font-semibold text-gray-900">Files</h2>
          </div>
          {explorer.currentPath && (
            <button
              onClick={explorer.navigateBack}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
              title="Go back"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Workspace selector (when no path is selected) */}
        {!explorer.currentPath && (
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Agent Workspaces
              </h3>
              <div className="space-y-2">
                {explorer.roots.map((root) => (
                  <button
                    key={root.id}
                    onClick={() => explorer.navigateToRoot(root)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{root.name}</p>
                      <p className="text-xs text-gray-400 truncate">{root.path}</p>
                    </div>
                  </button>
                ))}
                {explorer.roots.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-8">
                    No workspaces found
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Breadcrumb */}
        {explorer.currentPath && (
          <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-1 overflow-x-auto text-xs">
            <button
              onClick={() => {
                explorer.reset();
                setShowFileOnMobile(false);
              }}
              className="text-blue-500 hover:text-blue-700 flex-shrink-0"
            >
              Workspaces
            </button>
            {breadcrumbs.map((segment, i) => {
              const segPath = "/" + breadcrumbs.slice(0, i + 1).join("/");
              const isLast = i === breadcrumbs.length - 1;
              return (
                <span key={i} className="flex items-center gap-1">
                  <span className="text-gray-300">/</span>
                  {isLast ? (
                    <span className="text-gray-700 font-medium">{segment}</span>
                  ) : (
                    <button
                      onClick={() => explorer.navigateTo(segPath)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      {segment}
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        )}

        {/* File list */}
        {explorer.currentPath && (
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {explorer.loading && !explorer.selectedFile && (
              <div className="flex items-center justify-center py-12">
                <svg className="w-5 h-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            )}

            {explorer.error && (
              <div className="p-4">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{explorer.error}</p>
                </div>
              </div>
            )}

            {!explorer.loading && explorer.entries.length === 0 && !explorer.error && (
              <p className="text-sm text-gray-400 text-center py-12">
                Empty directory
              </p>
            )}

            {explorer.entries.map((entry) => (
              <button
                key={entry.path}
                onClick={() => handleEntryClick(entry)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 ${
                  explorer.selectedFile?.path === entry.path ? "bg-blue-50" : ""
                }`}
              >
                {fileIcon(entry)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{entry.name}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {!entry.isDirectory && (
                    <span className="text-[10px] text-gray-400">
                      {formatSize(entry.size)}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-300">
                    {formatDate(entry.mtime)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* File viewer panel */}
      <div
        className={`${
          showFileOnMobile && explorer.selectedFile ? "flex" : "hidden"
        } md:flex flex-col flex-1 min-w-0`}
      >
        {explorer.selectedFile ? (
          <>
            {/* File header */}
            <div className="h-14 px-4 flex items-center gap-3 bg-white border-b border-gray-200">
              <button
                onClick={() => {
                  setShowFileOnMobile(false);
                  explorer.clearFile();
                }}
                className="md:hidden p-1.5 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {explorer.selectedFile.name}
                </p>
                <p className="text-[10px] text-gray-400">
                  {formatSize(explorer.selectedFile.size)} &middot; {formatDate(explorer.selectedFile.mtime)}
                </p>
              </div>
            </div>

            {/* File content */}
            <div className="flex-1 overflow-auto bg-gray-50">
              {explorer.selectedFile.binary ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-gray-500">Binary file</p>
                  <p className="text-xs text-gray-400 mt-1">{formatSize(explorer.selectedFile.size)}</p>
                </div>
              ) : (
                <pre className="p-4 text-xs sm:text-sm font-mono text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                  {explorer.selectedFile.content}
                </pre>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-1">File Explorer</h3>
            <p className="text-sm text-gray-500 max-w-xs">
              Select a file from the workspace to view its contents.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
