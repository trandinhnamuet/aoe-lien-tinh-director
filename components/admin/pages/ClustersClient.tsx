"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createCluster, updateCluster, deleteCluster, setClusterStatus, setCurrentCluster } from "@/lib/actions";
import type { TournamentWithCount, ClusterWithMeta } from "@/lib/admin-queries";
import type { ClusterStatus } from "@/lib/types";
import { Btn, Card, Field, Input, PageTitle, Select, Badge, Toast, useToast, FONT_SAIRA, FONT_MONO } from "@/components/admin/ui";

const STATUS_LABEL: Record<ClusterStatus, string> = { draft: "Chưa thi đấu", live: "Đang thi đấu", done: "Đã thi đấu" };

export default function ClustersClient({ tournaments, clusters, tournamentId, currentClusterId }: {
  tournaments: TournamentWithCount[]; clusters: ClusterWithMeta[]; tournamentId: string; currentClusterId: string | null;
}) {
  const router = useRouter();
  const { msg, show } = useToast();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [ef, setEf] = useState({ name: "", location: "", date: "" });

  async function add() {
    if (!tournamentId) { show("Hãy tạo giải đấu trước"); return; }
    setBusy(true);
    const r = await createCluster({ tournamentId, name, location, date });
    setBusy(false);
    if (r.ok) { setName(""); setLocation(""); setDate(""); show("Đã tạo cụm"); router.refresh(); } else show(r.error);
  }
  function startEdit(c: ClusterWithMeta) {
    setEditId(c.id);
    // date_fmt is DD.MM.YYYY → convert to YYYY-MM-DD for the date input
    const iso = c.date_fmt && /^\d{2}\.\d{2}\.\d{4}$/.test(c.date_fmt)
      ? c.date_fmt.split(".").reverse().join("-") : "";
    setEf({ name: c.name, location: c.location ?? "", date: iso });
  }
  async function saveEdit() {
    if (!ef.name.trim()) { show("Tên cụm không được trống"); return; }
    setBusy(true);
    const r = await updateCluster(editId!, { name: ef.name, location: ef.location, date: ef.date });
    setBusy(false);
    if (r.ok) { setEditId(null); show("Đã cập nhật cụm"); router.refresh(); } else show(r.error);
  }
  async function changeStatus(id: string, status: ClusterStatus) {
    const r = await setClusterStatus(id, status);
    if (r.ok) { show("Đã đổi trạng thái"); router.refresh(); } else show(r.error);
  }
  async function makeCurrent(id: string) {
    const r = await setCurrentCluster(id);
    if (r.ok) { show("Đã đặt làm cụm hiện tại · chuyển sang Đang thi đấu"); router.refresh(); } else show(r.error);
  }
  async function del(id: string, n: string) {
    if (!confirm(`Xóa cụm "${n}"? Game thủ & kết quả của cụm sẽ bị xóa.`)) return;
    const r = await deleteCluster(id);
    if (r.ok) { show("Đã xóa"); router.refresh(); } else show(r.error);
  }

  return (
    <div>
      <PageTitle title="Cụm thi đấu" sub="A4 · QUẢN LÝ CỤM · TRẠNG THÁI · CỤM HIỆN TẠI" right={
        <Select value={tournamentId} onChange={(e) => router.push(`/admin/clusters?tournament=${e.target.value}`)} style={{ width: 240 }}>
          {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
      } />

      <Card style={{ marginBottom: 22 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 12, alignItems: "end" }}>
          <Field label="Tên cụm"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cụm Hà Nội" /></Field>
          <Field label="Địa điểm"><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="GG Center Cầu Giấy" /></Field>
          <Field label="Ngày thi đấu"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field><Btn kind="primary" onClick={add} disabled={busy}>+ Tạo cụm</Btn></Field>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))", gap: 14 }}>
        {clusters.map((c) => {
          const isCurrent = c.id === currentClusterId;
          if (editId === c.id) {
            return (
              <Card key={c.id} style={{ border: "1px solid rgba(93,182,255,.5)" }}>
                <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#5db6ff", letterSpacing: 1, marginBottom: 12 }}>SỬA CỤM</div>
                <Field label="Tên cụm"><Input value={ef.name} onChange={(e) => setEf({ ...ef, name: e.target.value })} placeholder="Cụm Hà Nội" /></Field>
                <Field label="Địa điểm"><Input value={ef.location} onChange={(e) => setEf({ ...ef, location: e.target.value })} placeholder="GG Center Cầu Giấy" /></Field>
                <Field label="Ngày thi đấu"><Input type="date" value={ef.date} onChange={(e) => setEf({ ...ef, date: e.target.value })} /></Field>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <Btn kind="primary" onClick={saveEdit} disabled={busy}>Lưu</Btn>
                  <Btn kind="ghost" onClick={() => setEditId(null)}>Hủy</Btn>
                </div>
              </Card>
            );
          }
          return (
            <Card key={c.id} style={isCurrent ? { border: "1px solid rgba(93,182,255,.5)" } : undefined}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div>
                  <div style={{ fontFamily: FONT_SAIRA, fontWeight: 800, fontStyle: "italic", fontSize: 21, textTransform: "uppercase" }}>{c.name}</div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#b9c3e6", marginTop: 4 }}>{c.date_fmt ?? "—"} · {c.location ?? "—"}</div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#b9c3e6", marginTop: 3 }}>{c.player_count} game thủ · {c.round_count} vòng</div>
                </div>
                <Badge tone={c.status === "live" ? "live" : c.status === "done" ? "done" : "muted"}>{STATUS_LABEL[c.status].toUpperCase()}</Badge>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 }}>
                <Select value={c.status} onChange={(e) => changeStatus(c.id, e.target.value as ClusterStatus)} style={{ width: "auto", flex: 1, padding: "7px 10px", fontSize: 13 }}>
                  <option value="draft">Chưa thi đấu</option>
                  <option value="live">Đang thi đấu</option>
                  <option value="done">Đã thi đấu</option>
                </Select>
                {!isCurrent && <Btn kind="secondary" onClick={() => makeCurrent(c.id)} style={{ fontSize: 12, padding: "7px 10px" }}>Đặt hiện tại</Btn>}
                {isCurrent && <Badge tone="live">HIỆN TẠI</Badge>}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <button onClick={() => startEdit(c)} style={{ ...lnk, cursor: "pointer", background: "transparent" }}>Sửa</button>
                <Link href={`/admin/players?cluster=${c.id}`} style={lnk}>Game thủ</Link>
                <Link href={`/admin/formats?cluster=${c.id}`} style={lnk}>Thể thức</Link>
                <Link href={`/admin/results?cluster=${c.id}`} style={lnk}>Kết quả</Link>
                <button onClick={() => del(c.id, c.name)} style={{ ...lnk, color: "#ff8fa8", border: "1px solid #4a2230", background: "transparent", cursor: "pointer" }}>Xóa</button>
              </div>
            </Card>
          );
        })}
        {clusters.length === 0 && <div style={{ color: "#b9c3e6", fontFamily: FONT_MONO, fontSize: 13 }}>Chưa có cụm nào cho giải này.</div>}
      </div>
      <Toast message={msg} />
    </div>
  );
}

const lnk: React.CSSProperties = { fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, letterSpacing: 1, color: "#9bd8ff", textDecoration: "none", padding: "5px 9px", borderRadius: 6, border: "1px solid rgba(93,182,255,.25)" };
