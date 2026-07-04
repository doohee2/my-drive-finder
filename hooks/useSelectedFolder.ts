import { useState, useEffect } from "react";

export interface Folder {
  id: string;
  name: string;
}

export function useSelectedFolder() {
  const [folder, setFolder] = useState<Folder | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("selectedFolder");
    if (saved) {
      try {
        setFolder(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const setAndSaveFolder = (newFolder: Folder | null) => {
    setFolder(newFolder);
    if (newFolder) {
      localStorage.setItem("selectedFolder", JSON.stringify(newFolder));
    } else {
      localStorage.removeItem("selectedFolder");
    }
    window.dispatchEvent(new Event("selectedFolderChanged"));
  };

  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem("selectedFolder");
      setFolder(saved ? JSON.parse(saved) : null);
    };
    window.addEventListener("selectedFolderChanged", handleStorage);
    return () => window.removeEventListener("selectedFolderChanged", handleStorage);
  }, []);

  return [folder, setAndSaveFolder] as const;
}
