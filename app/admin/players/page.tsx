import { resolveScope, listPlayers } from "@/lib/admin-queries";
import PlayersClient from "@/components/admin/pages/PlayersClient";
import { NoCluster } from "@/components/admin/pages/NoCluster";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ tournament?: string; cluster?: string }> }) {
  const sp = await searchParams;
  const { tournaments, tournamentId, clusters, clusterId } = await resolveScope(sp);
  if (!clusterId) return <NoCluster />;
  const players = await listPlayers(clusterId);
  const current = clusters.find((c) => c.id === clusterId);
  return <PlayersClient tournaments={tournaments} tournamentId={tournamentId ?? ""} clusters={clusters} clusterId={clusterId} clusterName={current?.name ?? ""} players={players} />;
}
