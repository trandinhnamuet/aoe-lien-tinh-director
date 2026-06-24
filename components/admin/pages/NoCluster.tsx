import Link from "next/link";
import { FONT_MONO } from "@/components/admin/ui";

export function NoCluster() {
  return (
    <div style={{ padding: "60px 20px", textAlign: "center", color: "#7e8cc8", fontFamily: FONT_MONO, fontSize: 13 }}>
      Chưa có cụm thi đấu nào. <Link href="/admin/clusters" style={{ color: "#9bd8ff" }}>Tạo cụm ở đây →</Link>
    </div>
  );
}
