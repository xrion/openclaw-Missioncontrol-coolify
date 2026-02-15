import { useCallback, useEffect, useState } from "react";

export interface ServerFileRoot {
  id: string;
  name: string;
  path: string;
  readOnly: boolean;
}

export interface ServerFileEntry {
  name: string;
  kind: "directory" | "file" | "other";
  path: string;
  size: number;
  modifiedAt: number;
}

export interface ServerDirectoryListing {
  root: { id: string; name: string };
  currentPath: string;
  parentPath: string | null;
  entries: ServerFileEntry[];
}

export interface ServerFileReadResult {
  root: { id: string; name: string };
  path: string;
  size: number;
  modifiedAt: number;
  binary: boolean;
  truncated: boolean;
  content?: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status})`);
  }
  return data as T;
}

function buildQuery(params: Record<string, string>): string {
  const search = new URLSearchParams(params);
  return search.toString();
}

export function useServerFiles() {
  const [roots, setRoots] = useState<ServerFileRoot[]>([]);
  const [loadingRoots, setLoadingRoots] = useState(true);
  const [rootsError, setRootsError] = useState<string | null>(null);

  const loadRoots = useCallback(async () => {
    setLoadingRoots(true);
    try {
      const data = await fetchJson<{ roots: ServerFileRoot[] }>("/api/files/roots");
      setRoots(data.roots || []);
      setRootsError(null);
    } catch (error: any) {
      setRootsError(error?.message || "Failed to load file roots");
      setRoots([]);
    } finally {
      setLoadingRoots(false);
    }
  }, []);

  useEffect(() => {
    void loadRoots();
  }, [loadRoots]);

  const listDirectory = useCallback(async (rootId: string, path: string) => {
    const query = buildQuery({ root: rootId, path });
    return fetchJson<ServerDirectoryListing>(`/api/files/list?${query}`);
  }, []);

  const readFile = useCallback(
    async (rootId: string, path: string, maxBytes = 262144) => {
      const query = buildQuery({
        root: rootId,
        path,
        maxBytes: String(maxBytes),
      });
      return fetchJson<ServerFileReadResult>(`/api/files/read?${query}`);
    },
    []
  );

  const buildDownloadUrl = useCallback((rootId: string, path: string) => {
    const query = buildQuery({ root: rootId, path });
    return `/api/files/download?${query}`;
  }, []);

  return {
    roots,
    loadingRoots,
    rootsError,
    refreshRoots: loadRoots,
    listDirectory,
    readFile,
    buildDownloadUrl,
  };
}
