import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import localforage from "localforage";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { fetchWithSessionRetry } from "@/lib/fetchWithSessionRetry";

interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
  mimeType: string;
  size: string;
}

export interface CachedRow {
  _id: string;
  _fileId: string;
  _fileName: string;
  _folderId: string;
  _sheetName?: string;
  [key: string]: any;
}

export function useDriveSync(folderId?: string | null) {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState("");

  const cacheKey = `driveData_${folderId}`;
  const metadataKey = `driveMetadata_${folderId}`;

  // Fetch local cached data
  const { data: cachedData = [], isLoading: isLoadingCache } = useQuery({
    queryKey: [cacheKey],
    queryFn: async () => {
      if (!folderId) return [];
      const data = await localforage.getItem<CachedRow[]>(cacheKey);
      return data || [];
    },
    enabled: !!folderId,
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!folderId) return;

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        alert("현재 오프라인 상태입니다. 인터넷 연결을 확인해주세요.");
        return;
      }

      // Cooldown check
      const lastSyncStr = await localforage.getItem<string>(`lastSync_${folderId}`);
      if (lastSyncStr) {
        const lastSyncDate = new Date(lastSyncStr);
        const diffSeconds = (Date.now() - lastSyncDate.getTime()) / 1000;
        if (diffSeconds < 30) {
          alert(`동기화는 30초마다 가능합니다. 잠시 후 다시 시도해 주세요. (${Math.ceil(30 - diffSeconds)}초 남음)`);
          return;
        }
      }

      setIsSyncing(true);
      setSyncProgress("파일 목록 조회 중...");

      try {
        // 1. Fetch remote file metadata
        const res = await fetchWithSessionRetry(`/api/drive/files?folderId=${folderId}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error("Failed to fetch file list");
        const { files } = (await res.json()) as { files: DriveFile[] };

        // 2. Fetch local metadata
        const localMetadata = (await localforage.getItem<Record<string, string>>(metadataKey)) || {};
        let currentData = (await localforage.getItem<CachedRow[]>(cacheKey)) || [];

        const newMetadata: Record<string, string> = { ...localMetadata };
        let hasChanges = false;

        for (let i = 0; i < files.length; i++) {
          if (typeof navigator !== "undefined" && !navigator.onLine) {
            console.warn("오프라인 전환 감지: 동기화 작업을 중지합니다.");
            break;
          }
          const file = files[i];
          const localModified = localMetadata[file.id];

          // If file is new or modified
          if (!localModified || localModified !== file.modifiedTime) {
            hasChanges = true;
            setSyncProgress(`다운로드 중... (${i + 1}/${files.length}) ${file.name}`);

            const dlRes = await fetchWithSessionRetry(`/api/drive/download?fileId=${file.id}&mimeType=${encodeURIComponent(file.mimeType)}`, {
              signal: AbortSignal.timeout(5000),
            });
            if (!dlRes.ok) {
              console.error(`Failed to download ${file.name}`);
              continue;
            }

            const buffer = await dlRes.arrayBuffer();
            let rows: any[] = [];

            if (file.mimeType === "text/csv") {
              const text = new TextDecoder().decode(buffer);
              const result = Papa.parse(text, { header: true, skipEmptyLines: true });
              rows = result.data.map((r: any) => ({ ...r, _sheetName: "CSV" }));
            } else {
              // Excel file or Google Sheet exported as Excel
              const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
              for (const sheetName of workbook.SheetNames) {
                const worksheet = workbook.Sheets[sheetName];
                const sheetRows = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false, dateNF: "yyyy-mm-dd hh:mm:ss" });
                rows.push(...sheetRows.map((r: any) => ({ ...r, _sheetName: sheetName })));
              }
            }

            // Remove old rows for this file
            currentData = currentData.filter((row) => row._fileId !== file.id);

            // Append new rows with metadata
            const newRows: CachedRow[] = rows.map((row, index) => ({
              ...row,
              _id: `${file.id}_${index}_${Date.now()}`,
              _fileId: file.id,
              _fileName: file.name,
              _folderId: folderId,
            }));

            currentData = [...currentData, ...newRows];
            newMetadata[file.id] = file.modifiedTime;
          }
        }

        // Clean up deleted files from local cache
        const remoteIds = new Set(files.map((f) => f.id));
        const deletedIds = Object.keys(newMetadata).filter((id) => !remoteIds.has(id));
        if (deletedIds.length > 0) {
          hasChanges = true;
          deletedIds.forEach((id) => {
            delete newMetadata[id];
            currentData = currentData.filter((row) => row._fileId !== id);
          });
        }

        // 3. Save if changes occurred
        if (hasChanges) {
          setSyncProgress("로컬 저장소 업데이트 중...");
          
          const dataString = JSON.stringify(currentData);
          const sizeInBytes = new Blob([dataString]).size;
          
          await localforage.setItem(cacheKey, currentData);
          await localforage.setItem(metadataKey, newMetadata);
          await localforage.setItem(`lastSync_${folderId}`, new Date().toISOString());
          await localforage.setItem(`cacheSize_${folderId}`, sizeInBytes);
        }
        
      } finally {
        setIsSyncing(false);
        setSyncProgress("");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [cacheKey] });
      queryClient.invalidateQueries({ queryKey: [`lastSync_${folderId}`] });
    },
  });

  // Query for last sync time
  const { data: lastSyncTime } = useQuery({
    queryKey: [`lastSync_${folderId}`],
    queryFn: async () => {
      if (!folderId) return null;
      return await localforage.getItem<string>(`lastSync_${folderId}`);
    },
    enabled: !!folderId,
  });

  return {
    cachedData,
    isLoadingCache,
    isSyncing,
    syncProgress,
    lastSyncTime,
    sync: () => syncMutation.mutate(),
  };
}
