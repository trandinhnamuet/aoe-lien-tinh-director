import Link from "next/link";
import { adminOverview } from "@/lib/admin-queries";
import { Card, FONT_SAIRA, FONT_MONO } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const { settings, cluster, tournaments, counts } = await adminOverview();
  const stat = (label: string, value: string | number, color = "#bfe2ff") => (
    <Card style={{ padding: 18 }}>
      <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 1, color: "#7e8cc8" }}>{label}</div>
      <div style={{ fontFamily: FONT_SAIRA, fontWeight: 800, fontStyle: "italic", fontSize: 32, color }}>{value}</div>
    </Card>
  );
  const links: [string, string, string][] = [
    ["/admin/players", "Nhập game thủ", "Thêm tay hoặc import Excel"],
    ["/admin/pairing", "Xếp cặp / chia bảng", "Random & chốt cặp đấu"],
    ["/admin/results", "Cập nhật kết quả", "Nhập tỉ số từng trận"],
    ["/admin/clusters", "Cụm thi đấu", "Trạng thái & cụm hiện tại"],
  ];
  return (
    <div>
      <h1 style={{ fontFamily: FONT_SAIRA, fontWeight: 800, fontStyle: "italic", fontSize: 26, textTransform: "uppercase", margin: "0 0 4px", background: "linear-gradient(180deg,#fff,#9bd8ff)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Bảng điều khiển</h1>
      <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#7e8cc8", letterSpacing: 1, marginBottom: 22 }}>
        CỤM HIỆN TẠI: {cluster ? cluster.name.toUpperCase() : "CHƯA CHỌN"}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 14, marginBottom: 26 }}>
        {stat("Số giải đấu", tournaments.length)}
        {stat("Game thủ (cụm)", counts.players)}
        {stat("Cặp đã có KQ", `${counts.matchesDone}/${counts.matchesTotal}`, "#5db6ff")}
        {stat("Kiểm tra CCCD", settings.check_duplicate_cccd ? "BẬT" : "TẮT", settings.check_duplicate_cccd ? "#5db6ff" : "#6675a6")}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))", gap: 14 }}>
        {links.map(([href, title, desc]) => (
          <Link key={href} href={href} style={{ textDecoration: "none" }}>
            <Card style={{ cursor: "pointer" }}>
              <div style={{ fontFamily: FONT_SAIRA, fontWeight: 700, fontSize: 19, textTransform: "uppercase", color: "#e8eeff" }}>{title}</div>
              <div style={{ fontSize: 12, color: "#7e8cc8", marginTop: 4 }}>{desc}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
