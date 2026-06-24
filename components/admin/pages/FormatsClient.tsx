"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addRound, updateRound, deleteRound, setRoundStatus, applyTemplate } from "@/lib/actions";
import type { ClusterWithMeta, FormatTemplate, TournamentWithCount } from "@/lib/admin-queries";
import type { Round, RoundType, RoundStatus } from "@/lib/types";
import { Btn, Card, Field, Input, PageTitle, Select, Badge, Toast, useToast, FONT_SAIRA, FONT_MONO } from "@/components/admin/ui";
import AdminScopePicker from "@/components/admin/AdminScopePicker";

const TYPE_LABEL: Record<RoundType, string> = {
  group: "Chia bảng", swiss: "Nhánh thắng thua (Swiss)", knockout_multi: "Loại trực tiếp · chọn nhiều", knockout_single: "Loại trực tiếp · tìm vô địch",
};

export default function FormatsClient({ tournaments, tournamentId, clusters, clusterId, clusterName, rounds, templates }: {
  tournaments: TournamentWithCount[]; tournamentId: string; clusters: ClusterWithMeta[]; clusterId: string; clusterName: string; rounds: Round[]; templates: FormatTemplate[];
}) {
  const router = useRouter();
  const { msg, show } = useToast();
  const [name, setName] = useState("");
  const [type, setType] = useState<RoundType>("group");
  const [cfg, setCfg] = useState<Record<string, number | boolean>>({ advance_per_group: 2, best_of: 3 });
  const [busy, setBusy] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [ef, setEf] = useState<{ name: string; type: RoundType; cfg: Record<string, number | boolean> }>({ name: "", type: "group", cfg: {} });

  function onType(t: RoundType) {
    setType(t);
    if (t === "group") setCfg({ advance_per_group: 2, best_of: 3 });
    else if (t === "swiss") setCfg({ wins_to_advance: 2, best_of: 2 });
    else if (t === "knockout_single") setCfg({ best_of: 3, final_best_of: 5, third_place: true });
    else setCfg({ best_of: 3 });
  }
  async function add() {
    if (!name.trim()) { show("Nhập tên vòng"); return; }
    setBusy(true);
    const r = await addRound(clusterId, { name, round_type: type, config: cfg });
    setBusy(false);
    if (r.ok) { setName(""); show("Đã thêm vòng"); router.refresh(); } else show(r.error);
  }
  async function apply(id: string, n: string) {
    if (!confirm(`Áp "${n}" vào ${clusterName}? Sẽ thay thế toàn bộ vòng hiện có của cụm.`)) return;
    const r = await applyTemplate(clusterId, id);
    if (r.ok) { show(`Đã tạo ${r.created} vòng`); router.refresh(); } else show(r.error);
  }
  function startEdit(r: Round) {
    setEditId(r.id);
    setEf({ name: r.name, type: r.round_type, cfg: (r.config ?? {}) as Record<string, number | boolean> });
  }
  async function saveEdit() {
    if (!ef.name.trim()) { show("Nhập tên vòng"); return; }
    setBusy(true);
    const r = await updateRound(editId!, { name: ef.name, config: ef.cfg });
    setBusy(false);
    if (r.ok) { setEditId(null); show("Đã cập nhật vòng"); router.refresh(); } else show(r.error);
  }

  async function del(id: string) {
    if (!confirm("Xóa vòng này? Cặp đấu/bảng của vòng sẽ bị xóa.")) return;
    const r = await deleteRound(id);
    if (r.ok) { show("Đã xóa"); router.refresh(); } else show(r.error);
  }
  async function status(id: string, s: RoundStatus) {
    const r = await setRoundStatus(id, s);
    if (r.ok) { show("Đã đổi trạng thái"); router.refresh(); } else show(r.error);
  }

  const numField = (key: string, label: string) => (
    <Field label={label}><Input type="number" value={String(cfg[key] ?? 0)} onChange={(e) => setCfg({ ...cfg, [key]: +e.target.value })} style={{ width: 90 }} /></Field>
  );
  const efNum = (key: string, label: string) => (
    <Field label={label}><Input type="number" value={String(ef.cfg[key] ?? 0)} onChange={(e) => setEf({ ...ef, cfg: { ...ef.cfg, [key]: +e.target.value } })} style={{ width: 90 }} /></Field>
  );

  return (
    <div>
      <PageTitle title="Thể thức & vòng đấu" sub={`A5 · ${clusterName.toUpperCase()}`} right={
        <AdminScopePicker basePath="/admin/formats" tournaments={tournaments} tournamentId={tournamentId} clusters={clusters} clusterId={clusterId} />
      } />

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#9aaad8", letterSpacing: 1, marginBottom: 10 }}>ÁP NHANH BỘ THỂ THỨC</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {templates.map((t) => (
            <button key={t.id} onClick={() => apply(t.id, t.name)} style={{ textAlign: "left", background: "rgba(93,182,255,.06)", border: "1px solid rgba(93,182,255,.25)", borderRadius: 10, padding: "10px 14px", cursor: "pointer", color: "#e8eeff", minWidth: 200 }}>
              <div style={{ fontFamily: FONT_SAIRA, fontWeight: 700, fontSize: 15 }}>{t.name}</div>
              <div style={{ fontSize: 11, color: "#9aaad8", marginTop: 3 }}>{t.description}</div>
            </button>
          ))}
        </div>
      </Card>

      <Card style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
          <Field label="Tên vòng"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vòng bảng" /></Field>
          <Field label="Loại vòng">
            <Select value={type} onChange={(e) => onType(e.target.value as RoundType)} style={{ width: 240 }}>
              {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          {type === "group" && <>{numField("advance_per_group", "Top mỗi bảng")}{numField("best_of", "Chạm")}</>}
          {type === "swiss" && <>{numField("wins_to_advance", "Thắng đi tiếp")}{numField("best_of", "Chạm")}</>}
          {type === "knockout_single" && <>{numField("best_of", "Chạm")}{numField("final_best_of", "CK chạm")}
            <Field label="Tranh 3–4"><Select value={String(cfg.third_place)} onChange={(e) => setCfg({ ...cfg, third_place: e.target.value === "true" })} style={{ width: 90 }}><option value="true">Có</option><option value="false">Không</option></Select></Field></>}
          {type === "knockout_multi" && numField("best_of", "Chạm")}
          <Field><Btn kind="primary" onClick={add} disabled={busy}>+ Thêm vòng</Btn></Field>
        </div>
        {type === "swiss" && <div style={{ fontSize: 12, color: "#9aaad8", marginTop: 4 }}>Số lượt = {2 * (Number(cfg.wins_to_advance) || 2) - 1} (suy ra từ số thắng để đi tiếp).</div>}
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rounds.map((r) => editId === r.id ? (
          <Card key={r.id} style={{ border: "1px solid rgba(93,182,255,.45)" }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#5db6ff", letterSpacing: 1, marginBottom: 12 }}>SỬA VÒNG #{r.order_no}</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
              <Field label="Tên vòng"><Input value={ef.name} onChange={(e) => setEf({ ...ef, name: e.target.value })} placeholder="Tên vòng" /></Field>
              {ef.type === "group" && <>{efNum("advance_per_group", "Top mỗi bảng")}{efNum("best_of", "Chạm")}</>}
              {ef.type === "swiss" && <>{efNum("wins_to_advance", "Thắng đi tiếp")}{efNum("best_of", "Chạm")}</>}
              {ef.type === "knockout_single" && <>
                {efNum("best_of", "Chạm")}{efNum("final_best_of", "CK chạm")}
                <Field label="Tranh 3–4">
                  <Select value={String(ef.cfg.third_place)} onChange={(e) => setEf({ ...ef, cfg: { ...ef.cfg, third_place: e.target.value === "true" } })} style={{ width: 90 }}>
                    <option value="true">Có</option><option value="false">Không</option>
                  </Select>
                </Field>
              </>}
              {ef.type === "knockout_multi" && efNum("best_of", "Chạm")}
              <Field>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn kind="primary" onClick={saveEdit} disabled={busy}>Lưu</Btn>
                  <Btn kind="ghost" onClick={() => setEditId(null)}>Hủy</Btn>
                </div>
              </Field>
            </div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#9aaad8", marginTop: 8 }}>{TYPE_LABEL[r.round_type]} — loại vòng không thay đổi được sau khi tạo</div>
          </Card>
        ) : (
          <Card key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontFamily: FONT_SAIRA, fontStyle: "italic", fontWeight: 800, fontSize: 22, color: "#5db6ff", minWidth: 26 }}>{r.order_no}</span>
              <div>
                <div style={{ fontFamily: FONT_SAIRA, fontWeight: 700, fontSize: 18, textTransform: "uppercase" }}>{r.name}</div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#9aaad8", marginTop: 3 }}>{TYPE_LABEL[r.round_type]} · {JSON.stringify(r.config)}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Badge tone={r.status === "live" ? "live" : r.status === "done" ? "done" : "muted"}>{r.status.toUpperCase()}</Badge>
              <Select value={r.status} onChange={(e) => status(r.id, e.target.value as RoundStatus)} style={{ width: "auto", padding: "6px 10px", fontSize: 12 }}>
                <option value="pending">Chờ</option><option value="live">Đang đánh</option><option value="done">Xong</option>
              </Select>
              <Link href={`/admin/pairing?tournament=${tournamentId}&cluster=${clusterId}&round=${r.id}`} style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#9bd8ff", textDecoration: "none", border: "1px solid rgba(93,182,255,.25)", padding: "6px 10px", borderRadius: 6 }}>XẾP CẶP</Link>
              <button onClick={() => startEdit(r)} style={{ color: "#9bd8ff", background: "transparent", border: "1px solid rgba(93,182,255,.3)", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}>Sửa</button>
              <button onClick={() => del(r.id)} style={{ color: "#ff8fa8", background: "transparent", border: "1px solid #4a2230", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}>Xóa</button>
            </div>
          </Card>
        ))}
        {rounds.length === 0 && <div style={{ color: "#9aaad8", fontFamily: FONT_MONO, fontSize: 13 }}>Chưa có vòng nào. Áp thể thức mẫu hoặc thêm vòng thủ công.</div>}
      </div>
      <Toast message={msg} />
    </div>
  );
}
