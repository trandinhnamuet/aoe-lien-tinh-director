import { resolveScope, listClusterMatches, listRounds } from "@/lib/admin-queries";
import ResultsClient from "@/components/admin/pages/ResultsClient";
import { NoCluster } from "@/components/admin/pages/NoCluster";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ tournament?: string; cluster?: string }> }) {
  const sp = await searchParams;
  const { tournaments, tournamentId, clusters, clusterId } = await resolveScope(sp);
  if (!clusterId) return <NoCluster />;
  const [matches, rounds] = await Promise.all([listClusterMatches(clusterId), listRounds(clusterId)]);
  const current = clusters.find((c) => c.id === clusterId);
  return <ResultsClient tournaments={tournaments} tournamentId={tournamentId ?? ""} clusters={clusters} clusterId={clusterId} clusterName={current?.name ?? ""} matches={matches} rounds={rounds} />;
}
