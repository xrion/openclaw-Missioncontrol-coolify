import { useState, useCallback } from "react";

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  mtime: number;
}

export interface FileContent {
  path: string;
  name: string;
  size: number;
  mtime: number;
  binary: boolean;
  content: string | null;
}

export interface WorkspaceRoot {
  name: string;
  id: string;
  path: string;
}

export function useFileExplorer() {
  const [roots, setRoots] = useState<WorkspaceRoot[]>([]);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pathHistory, setPathHistory] = useState<string[]>([]);

  const fetchRoots = useCallback(async () => {
    try {
      const res = await fetch("/api/files/roots");
      if (!res.ok) throw new Error("Failed to load workspaces");
      const data = await res.json();
      setRoots(data.roots || []);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const listDir = useCallback(async (dirPath: string) => {
    setLoading(true);
    setError(null);
    setSelectedFile(null);
    try {
      const res = await fetch(`/api/files/list?path=${encodeURIComponent(dirPath)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setEntries(data.items || []);
      setCurrentPath(data.path);
    } catch (err: any) {
      setError(err.message);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const readFile = useCallback(async (filePath: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/files/read?path=${encodeURIComponent(filePath)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data: FileContent = await res.json();
      setSelectedFile(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const navigateTo = useCallback(
    (dirPath: string) => {
      if (currentPath) {
        setPathHistory((prev) => [...prev, currentPath]);
      }
      listDir(dirPath);
    },
    [currentPath, listDir]
  );

  const navigateBack = useCallback(() => {
    if (pathHistory.length > 0) {
      const prev = pathHistory[pathHistory.length - 1];
      setPathHistory((h) => h.slice(0, -1));
      listDir(prev);
    } else if (currentPath) {
      // Go to parent directory
      const parent = currentPath.split("/").slice(0, -1).join("/");
      if (parent) listDir(parent);
    }
  }, [pathHistory, currentPath, listDir]);

  const navigateToRoot = useCallback(
    (root: WorkspaceRoot) => {
      setPathHistory([]);
      listDir(root.path);
    },
    [listDir]
  );

  return {
    roots,
    currentPath,
    entries,
    selectedFile,
    loading,
    error,

    fetchRoots,
    listDir,
    readFile,
    navigateTo,
    navigateBack,
    navigateToRoot,
    clearFile: () => setSelectedFile(null),
    reset: () => {
      setCurrentPath(null);
      setEntries([]);
      setSelectedFile(null);
      setPathHistory([]);
      setError(null);
    },
  };
}
