import { useMemo } from "react";
import { CachedRow } from "./useDriveSync";

export function useSearch(
  data: CachedRow[],
  query: string,
  excludeQuery: string,
  excludeEnabled: boolean
) {
  return useMemo(() => {
    if (!query.trim()) return [];

    const includeTokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const excludeTokens = excludeEnabled
      ? excludeQuery.toLowerCase().split(/\s+/).filter(Boolean)
      : [];

    return data.filter((row) => {
      // Serialize only data columns (ignoring metadata starting with _)
      const rowValuesStr = Object.entries(row)
        .filter(([key]) => !key.startsWith("_"))
        .map(([_, val]) => String(val))
        .join(" ")
        .toLowerCase();

      const hasAllIncludes = includeTokens.every((token) =>
        rowValuesStr.includes(token)
      );
      
      if (!hasAllIncludes) return false;

      if (excludeTokens.length > 0) {
        const hasExclude = excludeTokens.some((token) =>
          rowValuesStr.includes(token)
        );
        if (hasExclude) return false;
      }

      return true;
    });
  }, [data, query, excludeQuery, excludeEnabled]);
}
