import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/lib/api";

const CATALOG_KEYS = [["products"], ["featured"], ["categories"], ["kits"], ["classes"]];

/**
 * Live sync: polls a tiny catalog version counter. Whenever the admin changes
 * anything, the version bumps and every catalog query is refetched instantly.
 */
export function useCatalogSync() {
  const qc = useQueryClient();
  const version = useQuery({
    queryKey: ["catalogVersion"],
    queryFn: api.catalogVersion,
    refetchInterval: 4000,
    refetchIntervalInBackground: false,
  });
  const last = useRef<number | null>(null);

  useEffect(() => {
    const v = version.data?.version;
    if (v === undefined) return;
    if (last.current !== null && last.current !== v) {
      CATALOG_KEYS.forEach((key) => qc.invalidateQueries({ queryKey: key }));
    }
    last.current = v;
  }, [version.data?.version, qc]);
}
