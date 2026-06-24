import { getClusterSnapshot, getDefaultClusterId } from "@/lib/queries";
import PublicPortal from "@/components/public/PublicPortal";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ cluster?: string }> }) {
  const { cluster } = await searchParams;
  const clusterId = cluster ?? (await getDefaultClusterId());

  if (!clusterId) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#aab4d8", fontFamily: "'IBM Plex Mono',monospace", padding: 24, textAlign: "center" }}>
        Chưa có cụm thi đấu nào được công bố. Vui lòng quay lại sau.
      </div>
    );
  }

  const snap = await getClusterSnapshot(clusterId);
  if (!snap || snap.cluster.status === "draft") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#aab4d8", fontFamily: "'IBM Plex Mono',monospace", padding: 24, textAlign: "center" }}>
        Cụm thi đấu này chưa được công bố.
      </div>
    );
  }

  return <PublicPortal initial={snap} />;
}
