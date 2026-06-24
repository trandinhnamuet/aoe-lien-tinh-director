"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { setSetting } from "@/lib/actions";
import type { Settings, TournamentWithCount, ClusterWithMeta } from "@/lib/admin-queries";
import { Btn, Card, Field, PageTitle, Select, Toggle, Toast, useToast, FONT_SAIRA, FONT_MONO } from "@/components/admin/ui";

export default function SettingsClient({ settings, tournaments, clusters }: { settings: Settings; tournaments: TournamentWithCount[]; clusters: ClusterWithMeta[] }) {
  const router = useRouter();
  const { msg, show } = useToast();
  const [check, setCheck] = useState(settings.check_duplicate_cccd);
  const [tour, setTour] = useState(settings.current_tournament_id ?? tournaments[0]?.id ?? "");
  const [cluster, setCluster] = useState(settings.current_cluster_id ?? "");

  async function save(key: string, value: unknown, label: string) {
    const r = await setSetting(key, value);
    if (r.ok) { show(label); router.refresh(); } else show(r.error);
  }

  return (
    <div>
      <PageTitle title="Cài đặt" sub="A9 · TÙY CHỈNH HỆ THỐNG" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))", gap: 16 }}>
        <Card>
          <div style={{ fontFamily: FONT_SAIRA, fontWeight: 700, fontSize: 18, textTransform: "uppercase", marginBottom: 6 }}>Kiểm tra trùng CCCD</div>
          <div style={{ fontSize: 12, color: "#aab6e0", marginBottom: 14 }}>Khi bật, không cho thêm game thủ có CCCD trùng trong cùng cụm. Mặc định tắt.</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Toggle on={check} onChange={(v) => { setCheck(v); save("check_duplicate_cccd", v, v ? "Đã bật kiểm tra CCCD" : "Đã tắt kiểm tra CCCD"); }} />
            <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: check ? "#5db6ff" : "#969ec2" }}>{check ? "ĐANG BẬT" : "ĐANG TẮT"}</span>
          </div>
        </Card>

        <Card>
          <div style={{ fontFamily: FONT_SAIRA, fontWeight: 700, fontSize: 18, textTransform: "uppercase", marginBottom: 12 }}>Cổng public hiển thị</div>
          <Field label="Giải đấu hiện tại">
            <Select value={tour} onChange={(e) => setTour(e.target.value)}>
              {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
          <Field label="Cụm mở mặc định">
            <Select value={cluster} onChange={(e) => setCluster(e.target.value)}>
              <option value="">— (tự chọn cụm đang/đã thi đấu) —</option>
              {clusters.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.status}</option>)}
            </Select>
          </Field>
          <Btn kind="primary" onClick={async () => {
            await setSetting("current_tournament_id", tour);
            await save("current_cluster_id", cluster || null, "Đã lưu cấu hình hiển thị");
          }}>Lưu</Btn>
        </Card>
      </div>
      <Toast message={msg} />
    </div>
  );
}
