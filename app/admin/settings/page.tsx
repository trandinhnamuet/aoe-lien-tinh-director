import { getSettings, listTournaments, listClusters } from "@/lib/admin-queries";
import SettingsClient from "@/components/admin/pages/SettingsClient";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [settings, tournaments] = await Promise.all([getSettings(), listTournaments()]);
  const clusters = await listClusters(settings.current_tournament_id ?? tournaments[0]?.id);
  return <SettingsClient settings={settings} tournaments={tournaments} clusters={clusters} />;
}
