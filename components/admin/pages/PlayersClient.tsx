"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addPlayer, deletePlayer } from "@/lib/actions";
import type { ClusterWithMeta, TournamentWithCount } from "@/lib/admin-queries";
import type { Player } from "@/lib/types";
import { Btn, Card, Field, Input, PageTitle, Toast, useToast, FONT_SAIRA, FONT_MONO } from "@/components/admin/ui";
import AdminScopePicker from "@/components/admin/AdminScopePicker";

export default function PlayersClient({ tournaments, tournamentId, clusters, clusterId, clusterName, players }: {
  tournaments: TournamentWithCount[]; tournamentId: string; clusters: ClusterWithMeta[]; clusterId: string; clusterName: string; players: Player[];
}) {
  const router = useRouter();
  const { msg, show } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ full_name: "", phone: "", aoe_nickname: "", birth_date: "", citizen_id: "", address: "", facebook_url: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function add() {
    setBusy(true);
    const r = await addPlayer(clusterId, f);
    setBusy(false);
    if (r.ok) { setF({ full_name: "", phone: "", aoe_nickname: "", birth_date: "", citizen_id: "", address: "", facebook_url: "" }); show("Đã thêm game thủ"); router.refresh(); }
    else show(r.error);
  }
  async function del(id: string, n: string) {
    if (!confirm(`Xóa game thủ "${n}"?`)) return;
    const r = await deletePlayer(id);
    if (r.ok) { show("Đã xóa"); router.refresh(); } else show(r.error);
  }
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("clusterId", clusterId);
    try {
      const res = await fetch("/api/admin/players/import", { method: "POST", body: fd });
      const j = await res.json();
      if (res.ok) { show(`Đã nhập ${j.inserted} game thủ${j.skipped ? `, bỏ qua ${j.skipped}` : ""}`); router.refresh(); }
      else show(j.error || "Lỗi nhập file");
    } catch { show("Lỗi tải file"); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  return (
    <div>
      <PageTitle title="Game thủ" sub={`A6 · ${clusterName.toUpperCase()} · ${players.length} NGƯỜI`} right={
        <AdminScopePicker basePath="/admin/players" tournaments={tournaments} tournamentId={tournamentId} clusters={clusters} clusterId={clusterId} />
      } />

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 12, alignItems: "end" }}>
          <Field label="Họ tên *"><Input value={f.full_name} onChange={set("full_name")} placeholder="Nguyễn Văn A" /></Field>
          <Field label="SĐT *"><Input value={f.phone} onChange={set("phone")} placeholder="09xxxxxxxx" /></Field>
          <Field label="Nickname AoE"><Input value={f.aoe_nickname} onChange={set("aoe_nickname")} /></Field>
          <Field label="Ngày sinh"><Input type="date" value={f.birth_date} onChange={set("birth_date")} /></Field>
          <Field label="CCCD"><Input value={f.citizen_id} onChange={set("citizen_id")} /></Field>
          <Field label="Địa chỉ"><Input value={f.address} onChange={set("address")} /></Field>
          <Field label="Facebook"><Input value={f.facebook_url} onChange={set("facebook_url")} /></Field>
          <Field><Btn kind="primary" onClick={add} disabled={busy}>+ Thêm</Btn></Field>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <a href="/api/admin/players/template" style={{ textDecoration: "none" }}><Btn kind="secondary">⬇ Tải file Excel mẫu</Btn></a>
        <Btn kind="secondary" onClick={() => fileRef.current?.click()} disabled={busy}>⬆ Nhập từ Excel</Btn>
        <input ref={fileRef} type="file" accept=".xlsx" hidden onChange={onFile} />
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1.2fr 1fr auto", gap: 0, padding: "10px 16px", background: "rgba(93,182,255,.06)", fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 1, color: "#9aaad8" }}>
          <span>HỌ TÊN / NICKNAME</span><span>SĐT</span><span>CCCD</span><span>ĐỊA CHỈ</span><span></span>
        </div>
        {players.map((p) => (
          <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1.2fr 1fr auto", gap: 0, padding: "10px 16px", alignItems: "center", borderTop: "1px solid rgba(93,182,255,.08)", fontSize: 13 }}>
            <div><div style={{ fontFamily: FONT_SAIRA, fontWeight: 700, fontSize: 15 }}>{p.full_name}</div>{p.aoe_nickname && <div style={{ fontFamily: FONT_SAIRA, fontWeight: 500, fontSize: 12, color: "#9bd8ff" }}>{p.aoe_nickname}</div>}</div>
            <span style={{ color: "#aab6e0" }}>{p.phone}</span>
            <span style={{ color: "#9aaad8", fontFamily: FONT_MONO, fontSize: 12 }}>{p.citizen_id || "—"}</span>
            <span style={{ color: "#9aaad8", fontSize: 12 }}>{p.address || "—"}</span>
            <button onClick={() => del(p.id, p.aoe_nickname || p.full_name)} style={{ color: "#ff8fa8", background: "transparent", border: "1px solid #4a2230", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11 }}>Xóa</button>
          </div>
        ))}
        {players.length === 0 && <div style={{ padding: 24, color: "#9aaad8", fontFamily: FONT_MONO, fontSize: 13, textAlign: "center" }}>Chưa có game thủ. Thêm tay hoặc nhập Excel.</div>}
      </Card>
      <Toast message={msg} />
    </div>
  );
}
