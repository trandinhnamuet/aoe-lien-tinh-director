"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Select } from "./ui";

interface NamedRow { id: string; name: string }

/** Tournament + cluster dropdowns used across admin pages that operate on one cluster.
 *  Changing tournament navigates with only ?tournament= so the server picks its first cluster.
 *  The currently-shown scope is mirrored into the `aoe_scope` cookie so that opening any
 *  other admin screen (via the sidebar, no query params) defaults to the same cluster. */
export default function AdminScopePicker({ basePath, tournaments, tournamentId, clusters, clusterId }: {
  basePath: string; tournaments: NamedRow[]; tournamentId: string; clusters: NamedRow[]; clusterId: string;
}) {
  const router = useRouter();
  useEffect(() => {
    if (tournamentId) document.cookie = `aoe_scope=${tournamentId}|${clusterId ?? ""}; path=/; max-age=2592000; samesite=lax`;
  }, [tournamentId, clusterId]);
  const go = (params: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) u.set(k, v);
    router.push(`${basePath}?${u.toString()}`);
  };
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Select value={tournamentId} onChange={(e) => go({ tournament: e.target.value })} style={{ width: 180 }} title="Giải đấu tổng">
        {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </Select>
      <Select value={clusterId} onChange={(e) => go({ tournament: tournamentId, cluster: e.target.value })} style={{ width: 200 }} title="Cụm thi đấu">
        {clusters.length === 0 && <option value="">(chưa có cụm)</option>}
        {clusters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
    </div>
  );
}
