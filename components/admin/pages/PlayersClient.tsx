"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addPlayer, deletePlayer } from "@/lib/actions";
import type { ClusterWithMeta, TournamentWithCount } from "@/lib/admin-queries";
import type { Player } from "@/lib/types";
import { Btn, Card, Field, Input, PageTitle, Toast, useToast, FONT_SAIRA, FONT_MONO } from "@/components/admin/ui";
import AdminScopePicker from "@/components/admin/AdminScopePicker";

type Issue = { row: number; name: string; reason: string };
type ImportReport = { inserted: number; errors: Issue[] };

export default function PlayersClient({ tournaments, tournamentId, clusters, clusterId, clusterName, players }: {
  tournaments: TournamentWithCount[]; tournamentId: string; clusters: ClusterWithMeta[]; clusterId: string; clusterName: string; players: Player[];
}) {
  const router = useRouter();
  const { msg, show } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
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
    setImporting(true);
    setReport(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("clusterId", clusterId);
    try {
      const res = await fetch("/api/admin/players/import", { method: "POST", body: fd });
      const j = await res.json();
      if (res.ok) {
        const errors: Issue[] = j.errors ?? [];
        setReport({ inserted: j.inserted ?? 0, errors });
        show(errors.length ? `Đã nhập ${j.inserted} · ${errors.length} dòng lỗi` : `Đã nhập ${j.inserted} game thủ`);
        router.refresh();
      } else {
        setReport({ inserted: 0, errors: [{ row: 0, name: "—", reason: j.error || "Lỗi nhập file" }] });
        show(j.error || "Lỗi nhập file");
      }
    } catch {
      setReport({ inserted: 0, errors: [{ row: 0, name: "—", reason: "Lỗi mạng hoặc đọc file khi tải lên. Kiểm tra kết nối và thử lại." }] });
      show("Lỗi tải file");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <PageTitle title="Game thủ" sub={`A6 · ${clusterName.toUpperCase()} · ${players.length} NGƯỜI`} right={
        <AdminScopePicker basePath="/admin/players" tournaments={tournaments} tournamentId={tournamentId} clusters={clusters} clusterId={clusterId} />
      } />

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))", gap: 12, alignItems: "end" }}>
          <Field label="Họ tên *"><Input value={f.full_name} onChange={set("full_name")} placeholder="Nguyễn Văn A" /></Field>
          <Field label="SĐT *"><Input value={f.phone} onChange={set("phone")} placeholder="09xxxxxxxx" /></Field>
          <Field label="Nickname AoE"><Input value={f.aoe_nickname} onChange={set("aoe_nickname")} /></Field>
          <Field label="Ngày sinh"><Input value={f.birth_date} onChange={set("birth_date")} placeholder="vd 20-05-1990 / 1990" /></Field>
          <Field label="CCCD"><Input value={f.citizen_id} onChange={set("citizen_id")} /></Field>
          <Field label="Địa chỉ"><Input value={f.address} onChange={set("address")} /></Field>
          <Field label="Facebook"><Input value={f.facebook_url} onChange={set("facebook_url")} /></Field>
          <Field><Btn kind="primary" onClick={add} disabled={busy}>+ Thêm</Btn></Field>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <a href="/api/admin/players/template" style={{ textDecoration: "none" }}><Btn kind="secondary">⬇ Tải file Excel mẫu</Btn></a>
        <Btn kind="secondary" onClick={() => fileRef.current?.click()} disabled={busy || importing}>{importing ? "⏳ Đang nhập…" : "⬆ Nhập từ Excel"}</Btn>
        <input ref={fileRef} type="file" accept=".xlsx" hidden onChange={onFile} />
      </div>

      {/* Import result report — clear, detailed reasons per failed row */}
      {report && (
        <Card style={{ marginBottom: 18, border: report.errors.length ? "1px solid rgba(255,143,168,.45)" : "1px solid rgba(52,199,108,.45)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontFamily: FONT_SAIRA, fontWeight: 800, fontSize: 18 }}>
              Kết quả nhập Excel: <span style={{ color: "#34c76c" }}>✓ {report.inserted} thành công</span>
              {report.errors.length > 0 && <span style={{ color: "#ff8fa8" }}> · ✕ {report.errors.length} dòng lỗi</span>}
            </div>
            <button onClick={() => setReport(null)} style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#b9c3e6", background: "transparent", border: "1px solid #2c3470", borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}>Đóng</button>
          </div>
          {report.errors.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#ff8fa8", letterSpacing: 1, marginBottom: 6 }}>CÁC DÒNG KHÔNG NHẬP ĐƯỢC — LÝ DO CỤ THỂ</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 300, overflowY: "auto" }}>
                {report.errors.map((e, i) => (
                  <div key={i} style={{ fontSize: 13, padding: "7px 11px", borderRadius: 7, background: "rgba(255,143,168,.08)", border: "1px solid rgba(255,143,168,.22)" }}>
                    {e.row > 0 && <b style={{ color: "#ff9db0" }}>Dòng {e.row}</b>}{e.row > 0 ? " · " : ""}<span style={{ fontWeight: 700 }}>{e.name}</span> — {e.reason}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Uploading animation overlay */}
      {importing && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(4,6,16,.72)", backdropFilter: "blur(3px)" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "30px 40px", borderRadius: 16, background: "rgba(14,19,54,.96)", border: "1px solid rgba(93,182,255,.3)", boxShadow: "0 20px 60px rgba(0,0,0,.55)" }}>
            <span style={{ width: 48, height: 48, borderRadius: "50%", border: "4px solid rgba(93,182,255,.22)", borderTopColor: "#5db6ff", animation: "spinSlow .8s linear infinite" }} />
            <div style={{ fontFamily: FONT_SAIRA, fontWeight: 700, fontSize: 18 }}>Đang nhập danh sách game thủ…</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#9bd8ff" }}>Đang xử lý từng dòng, vui lòng đợi</div>
          </div>
        </div>
      )}

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1.2fr 1fr auto", gap: 0, padding: "10px 16px", background: "rgba(93,182,255,.06)", fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 1, color: "#b9c3e6" }}>
          <span>HỌ TÊN / NICKNAME</span><span>SĐT</span><span>CCCD</span><span>ĐỊA CHỈ</span><span></span>
        </div>
        {players.map((p) => (
          <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1.2fr 1fr auto", gap: 0, padding: "10px 16px", alignItems: "center", borderTop: "1px solid rgba(93,182,255,.08)", fontSize: 13 }}>
            <div><div style={{ fontFamily: FONT_SAIRA, fontWeight: 700, fontSize: 15 }}>{p.full_name}</div>{p.aoe_nickname && <div style={{ fontFamily: FONT_SAIRA, fontWeight: 500, fontSize: 12, color: "#9bd8ff" }}>{p.aoe_nickname}</div>}</div>
            <span style={{ color: "#aab6e0" }}>{p.phone}</span>
            <span style={{ color: "#b9c3e6", fontFamily: FONT_MONO, fontSize: 12 }}>{p.citizen_id || "—"}</span>
            <span style={{ color: "#b9c3e6", fontSize: 12 }}>{p.address || "—"}</span>
            <button onClick={() => del(p.id, p.aoe_nickname || p.full_name)} style={{ color: "#ff8fa8", background: "transparent", border: "1px solid #4a2230", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11 }}>Xóa</button>
          </div>
        ))}
        {players.length === 0 && <div style={{ padding: 24, color: "#b9c3e6", fontFamily: FONT_MONO, fontSize: 13, textAlign: "center" }}>Chưa có game thủ. Thêm tay hoặc nhập Excel.</div>}
      </Card>
      <Toast message={msg} />
    </div>
  );
}
