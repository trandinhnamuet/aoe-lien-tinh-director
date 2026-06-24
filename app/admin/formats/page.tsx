import { resolveScope, listRounds, listFormatTemplates } from "@/lib/admin-queries";
import FormatsClient from "@/components/admin/pages/FormatsClient";
import { NoCluster } from "@/components/admin/pages/NoCluster";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ tournament?: string; cluster?: string }> }) {
  const sp = await searchParams;
  const [{ tournaments, tournamentId, clusters, clusterId }, templates] = await Promise.all([resolveScope(sp), listFormatTemplates()]);
  if (!clusterId) return <NoCluster />;
  const rounds = await listRounds(clusterId);
  const current = clusters.find((c) => c.id === clusterId);
  return <FormatsClient tournaments={tournaments} tournamentId={tournamentId ?? ""} clusters={clusters} clusterId={clusterId} clusterName={current?.name ?? ""} rounds={rounds} templates={templates} />;
}
