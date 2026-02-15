import { useEffect, useMemo, useState } from "react";
import {
  useServerFiles,
  type ServerDirectoryListing,
  type ServerFileReadResult,
} from "../../hooks/useServerFiles";

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(value: number): string {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function joinPath(parts: string[]): string {
  const filtered = parts.filter((part) => part && part !== ".");
  if (!filtered.length) return ".";
  return filtered.join("/");
}

export default function ServerFilesView() {
  const {
    roots,
    loadingRoots,
    rootsError,
    refreshRoots,
    listDirectory,
    readFile,
    buildDownloadUrl,
  } = useServerFiles();

  const [selectedRootId, setSelectedRootId] = useState<string>("");
  const [currentPath, setCurrentPath] = useState<string>(".");
  const [listing, setListing] = useState<ServerDirectoryListing | null>(null);
  const [listingError, setListingError] = useState<string | null>(null);
  const [loadingListing, setLoadingListing] = useState(false);

  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<ServerFileReadResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);

  useEffect(() => {
    if (!selectedRootId && roots.length > 0) {
      setSelectedRootId(roots[0].id);
      setCurrentPath(".");
      setSelectedFilePath(null);
      setFilePreview(null);
      setFileError(null);
    }
  }, [roots, selectedRootId]);

  useEffect(() => {
    if (!selectedRootId) return;

    let cancelled = false;
    setLoadingListing(true);
    setListingError(null);

    void listDirectory(selectedRootId, currentPath)
      .then((data) => {
        if (cancelled) return;
        setListing(data);
      })
      .catch((error: any) => {
        if (cancelled) return;
        setListingError(error?.message || "Failed to load directory");
        setListing(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingListing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedRootId, currentPath, listDirectory]);

  useEffect(() => {
    if (!selectedRootId || !selectedFilePath) return;

    let cancelled = false;
    setLoadingFile(true);
    setFileError(null);

    void readFile(selectedRootId, selectedFilePath)
      .then((data) => {
        if (cancelled) return;
        setFilePreview(data);
      })
      .catch((error: any) => {
        if (cancelled) return;
        setFileError(error?.message || "Failed to read file");
        setFilePreview(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingFile(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedRootId, selectedFilePath, readFile]);

  const breadcrumbs = useMemo(() => {
    const segments = (currentPath === "." ? "" : currentPath)
      .split("/")
      .filter(Boolean);

    const items: { label: string; path: string }[] = [{ label: "root", path: "." }];
    const acc: string[] = [];
    for (const segment of segments) {
      acc.push(segment);
      items.push({ label: segment, path: joinPath(acc) });
    }
    return items;
  }, [currentPath]);

  const handleRootChange = (nextRootId: string) => {
    setSelectedRootId(nextRootId);
    setCurrentPath(".");
    setSelectedFilePath(null);
    setFilePreview(null);
    setFileError(null);
  };

  const openDirectory = (targetPath: string) => {
    setCurrentPath(targetPath || ".");
    setSelectedFilePath(null);
    setFilePreview(null);
    setFileError(null);
  };

  const openFile = (targetPath: string) => {
    setSelectedFilePath(targetPath);
    setFilePreview(null);
    setFileError(null);
  };

  return (
    <div className="h-full p-4 flex flex-col gap-3 overflow-hidden">
      <section className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Server Files</h2>
            <p className="text-sm text-gray-500 mt-1">
              Browse shared server volumes and preview text files directly in Mission Control.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedRootId}
              onChange={(event) => handleRootChange(event.target.value)}
              disabled={loadingRoots || roots.length === 0}
              className="text-sm border border-gray-200 rounded-md px-3 py-1.5 bg-white"
            >
              {roots.map((root) => (
                <option key={root.id} value={root.id}>
                  {root.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                void refreshRoots();
                if (selectedRootId) {
                  setCurrentPath((prev) => prev || ".");
                }
              }}
              className="px-3 py-1.5 text-sm rounded-md bg-surface-100 text-gray-700 hover:bg-surface-200"
            >
              Refresh
            </button>
          </div>
        </div>
        {rootsError && (
          <p className="text-xs text-rose-700 mt-2 bg-rose-50 border border-rose-100 rounded-md px-2 py-1">
            {rootsError}
          </p>
        )}
      </section>

      <section className="flex-1 min-h-0 grid lg:grid-cols-2 gap-3">
        <article className="bg-white border border-gray-200 rounded-xl flex flex-col min-h-0">
          <div className="p-3 border-b border-gray-100 space-y-2">
            <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
              {breadcrumbs.map((item, index) => (
                <div key={`${item.path}-${index}`} className="flex items-center gap-2">
                  <button
                    onClick={() => openDirectory(item.path)}
                    className="hover:text-accent"
                  >
                    {item.label}
                  </button>
                  {index < breadcrumbs.length - 1 && <span>/</span>}
                </div>
              ))}
            </div>
            {listing?.parentPath && (
              <button
                onClick={() => openDirectory(listing.parentPath || ".")}
                className="px-2 py-1 text-xs rounded bg-surface-100 text-gray-600 hover:bg-surface-200"
              >
                Up one level
              </button>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
            {loadingListing && (
              <div className="p-4 text-sm text-gray-500">Loading directory...</div>
            )}
            {listingError && !loadingListing && (
              <div className="p-4 text-sm text-rose-700">{listingError}</div>
            )}
            {!loadingListing && !listingError && listing && (
              <div className="divide-y divide-gray-100">
                {listing.entries.map((entry) => {
                  const isActive = selectedFilePath === entry.path;
                  return (
                    <button
                      key={`${entry.kind}:${entry.path}`}
                      onClick={() =>
                        entry.kind === "directory"
                          ? openDirectory(entry.path)
                          : openFile(entry.path)
                      }
                      className={`w-full text-left px-3 py-2 hover:bg-surface-50 transition-colors ${
                        isActive ? "bg-blue-50" : "bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex items-center gap-2">
                          <span className="text-sm">
                            {entry.kind === "directory"
                              ? "📁"
                              : entry.kind === "file"
                              ? "📄"
                              : "📦"}
                          </span>
                          <span className="text-sm text-gray-800 truncate">
                            {entry.name}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-500 whitespace-nowrap">
                          {entry.kind === "directory"
                            ? "folder"
                            : formatBytes(entry.size)}
                        </span>
                      </div>
                    </button>
                  );
                })}
                {listing.entries.length === 0 && (
                  <div className="p-4 text-sm text-gray-400">Directory is empty.</div>
                )}
              </div>
            )}
          </div>
        </article>

        <article className="bg-white border border-gray-200 rounded-xl flex flex-col min-h-0">
          <div className="p-3 border-b border-gray-100 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Preview</h3>
              <p className="text-xs text-gray-500">
                {selectedFilePath || "Select a file to preview"}
              </p>
            </div>
            {selectedRootId && selectedFilePath && (
              <a
                href={buildDownloadUrl(selectedRootId, selectedFilePath)}
                className="px-2.5 py-1 text-xs rounded-md bg-surface-100 text-gray-700 hover:bg-surface-200"
              >
                Download
              </a>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-auto scrollbar-thin p-3">
            {!selectedFilePath && (
              <p className="text-sm text-gray-400">No file selected.</p>
            )}
            {selectedFilePath && loadingFile && (
              <p className="text-sm text-gray-500">Loading file...</p>
            )}
            {selectedFilePath && fileError && !loadingFile && (
              <p className="text-sm text-rose-700">{fileError}</p>
            )}
            {selectedFilePath && filePreview && !loadingFile && (
              <div className="space-y-3">
                <div className="text-xs text-gray-500 flex flex-wrap gap-3">
                  <span>Size: {formatBytes(filePreview.size)}</span>
                  <span>Updated: {formatDate(filePreview.modifiedAt)}</span>
                  {filePreview.truncated && <span>Preview truncated</span>}
                </div>
                {filePreview.binary ? (
                  <div className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
                    Binary file detected. Use download to inspect it locally.
                  </div>
                ) : (
                  <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words bg-surface-50 border border-gray-100 rounded-md p-3 overflow-auto">
                    {filePreview.content || ""}
                  </pre>
                )}
              </div>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
