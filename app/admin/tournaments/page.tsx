import { listTournaments, getSettings } from "@/lib/admin-queries";
import TournamentsClient from "@/components/admin/pages/TournamentsClient";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [tournaments, settings] = await Promise.all([listTournaments(), getSettings()]);
  return <TournamentsClient tournaments={tournaments} currentTournamentId={settings.current_tournament_id} />;
}
