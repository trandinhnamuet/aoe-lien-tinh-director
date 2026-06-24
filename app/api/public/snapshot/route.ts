import { NextRequest } from "next/server";
import { getClusterSnapshot } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const clusterId = request.nextUrl.searchParams.get("clusterId");
  if (!clusterId) return Response.json({ error: "missing clusterId" }, { status: 400 });

  // Public scope: only live/done clusters are visible.
  const snap = await getClusterSnapshot(clusterId);
  if (!snap) return Response.json({ error: "not found" }, { status: 404 });
  if (snap.cluster.status === "draft") return Response.json({ error: "not available" }, { status: 403 });

  return Response.json(snap);
}
