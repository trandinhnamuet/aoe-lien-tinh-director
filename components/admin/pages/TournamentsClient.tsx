"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createTournament, deleteTournament, updateTournament } from "@/lib/actions";
import type { TournamentWithCount } from "@/lib/admin-queries";
import { Btn, Card, Field, Input, PageTitle, Toast, useToast, FONT_SAIRA, FONT_MONO } from "@/components/admin/ui";

export default function TournamentsClient({ tournaments }: { tournaments: TournamentWithCount[] }) {
  const router = useRouter();
  const { msg, show } = useToast();
  const [name, setName] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [organizer, setOrganizer] = useState("CSDN Studio");
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [ef, setEf] = useState({ name: "", year: 0, organizer: "" });

  function startEdit(t: TournamentWithCount) {
    setEditId(t.id);
    setEf({ name: t.name, year: t.year, organizer: t.organizer ?? "" });
  }
  async function saveEdit() {
    const r = await updateTournament(editId!, ef);
    if (r.ok) { setEditId(null); show("Đã cập nhật giải"); router.refresh(); } else show(r.error);
  }

  async function add() {
    setBusy(true);
    const r = await createTournament({ name, year, organizer });
    setBusy(false);
    if (r.ok) { setName(""); show("Đã tạo giải đấu"); router.refresh(); }
    else show(r.error);
  }
  async function del(id: string, n: string) {
    if (!confirm(`Xóa giải "${n}"? Toàn bộ cụm, game thủ, kết quả sẽ bị xóa.`)) return;
    const r = await deleteTournament(id);
    if (r.ok) { show("Đã xóa"); router.refresh(); } else show(r.error);
  }

  return (
    <div>
      <PageTitle title="Giải đấu tổng" sub="A3 · TẠO & QUẢN LÝ GIẢI ĐẤU" />
      <Card style={{ marginBottom: 22 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr auto", gap: 12, alignItems: "end" }}>
          <Field label="Tên giải"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="AoE Liên Tỉnh" /></Field>
          <Field label="Năm"><Input type="number" value={year} onChange={(e) => setYear(+e.target.value)} /></Field>
          <Field label="Đơn vị tổ chức"><Input value={organizer} onChange={(e) => setOrganizer(e.target.value)} /></Field>
          <Field><Btn kind="primary" onClick={add} disabled={busy}>+ Tạo giải</Btn></Field>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 14 }}>
        {tournaments.map((t) => (
          <Card key={t.id}>
            {editId === t.id ? (
              <div>
                <Field label="Tên giải"><Input value={ef.name} onChange={(e) => setEf({ ...ef, name: e.target.value })} /></Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
                  <Field label="Năm"><Input type="number" value={ef.year} onChange={(e) => setEf({ ...ef, year: +e.target.value })} /></Field>
                  <Field label="Đơn vị tổ chức"><Input value={ef.organizer} onChange={(e) => setEf({ ...ef, organizer: e.target.value })} /></Field>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <Btn kind="primary" onClick={saveEdit} style={{ fontSize: 12, padding: "7px 12px" }}>Lưu</Btn>
                  <Btn kind="ghost" onClick={() => setEditId(null)} style={{ fontSize: 12, padding: "7px 12px" }}>Hủy</Btn>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div>
                    <div style={{ fontFamily: FONT_SAIRA, fontWeight: 800, fontStyle: "italic", fontSize: 22, textTransform: "uppercase" }}>{t.name}</div>
                    <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#7e8cc8", marginTop: 4 }}>{t.year} · {t.organizer ?? "—"} · {t.cluster_count} cụm</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn kind="secondary" onClick={() => startEdit(t)} style={{ padding: "6px 10px", fontSize: 12 }}>Sửa</Btn>
                    <Btn kind="danger" onClick={() => del(t.id, t.name)} style={{ padding: "6px 10px", fontSize: 12 }}>Xóa</Btn>
                  </div>
                </div>
                <Link href={`/admin/clusters?tournament=${t.id}`} style={{ display: "inline-block", marginTop: 14, fontFamily: FONT_MONO, fontSize: 11, color: "#9bd8ff", letterSpacing: 1, textDecoration: "none" }}>QUẢN LÝ CỤM →</Link>
              </>
            )}
          </Card>
        ))}
        {tournaments.length === 0 && <div style={{ color: "#7e8cc8", fontFamily: FONT_MONO, fontSize: 13 }}>Chưa có giải đấu nào.</div>}
      </div>
      <Toast message={msg} />
    </div>
  );
}
