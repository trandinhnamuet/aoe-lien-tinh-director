import { listTournaments } from "@/lib/admin-queries";
import TournamentsClient from "@/components/admin/pages/TournamentsClient";

export const dynamic = "force-dynamic";

export default async function Page() {
  const tournaments = await listTournaments();
  return <TournamentsClient tournaments={tournaments} />;
}
