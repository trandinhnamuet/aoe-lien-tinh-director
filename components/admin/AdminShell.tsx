"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FONT_SAIRA, FONT_MONO } from "./ui";

const NAV: { code: string; href: string; label: string }[] = [
  { code: "A2", href: "/admin", label: "Tổng quan" },
  { code: "A3", href: "/admin/tournaments", label: "Giải đấu tổng" },
  { code: "A4", href: "/admin/clusters", label: "Cụm thi đấu" },
  { code: "A5", href: "/admin/formats", label: "Thể thức & vòng" },
  { code: "A6", href: "/admin/players", label: "Game thủ" },
  { code: "A7", href: "/admin/pairing", label: "Xếp cặp / chia bảng" },
  { code: "A8", href: "/admin/results", label: "Cập nhật kết quả" },
  { code: "A9", href: "/admin/settings", label: "Cài đặt" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#080b1e", color: "#e8eeff" }}>
      <aside style={{ width: 248, flex: "none", background: "#0b0f28", borderRight: "1px solid rgba(93,182,255,.14)", padding: "20px 14px", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <Link href="/admin" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 22, padding: "0 6px" }}>
          <span style={{ width: 36, height: 36, borderRadius: 9, background: "linear-gradient(150deg,#9bd8ff,#3f7fe0)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_SAIRA, fontStyle: "italic", fontWeight: 800, color: "#0a1c44", fontSize: 20 }}>A</span>
          <div>
            <div style={{ fontFamily: FONT_SAIRA, fontWeight: 800, fontStyle: "italic", fontSize: 16, color: "#e8eeff", lineHeight: 1 }}>DIRECTOR</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: "#aab6e0", letterSpacing: 1.5, marginTop: 3 }}>BẢNG ĐIỀU KHIỂN</div>
          </div>
        </Link>
        <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {NAV.map((n) => {
            const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 9, textDecoration: "none", background: active ? "linear-gradient(150deg,#9bd8ff,#5db6ff)" : "transparent", color: active ? "#0a1c44" : "#aab6e0", fontWeight: active ? 600 : 400, fontSize: 14 }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 9, opacity: 0.7, minWidth: 18 }}>{n.code}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <a href="/" target="_blank" style={{ display: "block", marginTop: 22, padding: "10px 12px", borderRadius: 9, textDecoration: "none", color: "#aab6e0", fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1, border: "1px dashed #2c3470" }}>↗ XEM CỔNG PUBLIC</a>
      </aside>
      <main style={{ flex: 1, minWidth: 0, padding: "28px 28px 80px" }}>{children}</main>
    </div>
  );
}
