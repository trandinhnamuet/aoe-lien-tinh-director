import { listTournaments, listClusters, getSettings } from "@/lib/admin-queries";
import ClustersClient from "@/components/admin/pages/ClustersClient";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ tournament?: string }> }) {
  const { tournament } = await searchParams;
  const [tournaments, settings] = await Promise.all([listTournaments(), getSettings()]);
  const tournamentId = tournament ?? settings.current_tournament_id ?? tournaments[0]?.id;
  const clusters = await listClusters(tournamentId);
  return <ClustersClient tournaments={tournaments} clusters={clusters} tournamentId={tournamentId ?? ""} currentClusterId={settings.current_cluster_id} />;
}
