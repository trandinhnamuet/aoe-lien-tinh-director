import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { isAdmin } from "@/lib/auth";
import { importPlayers, type PlayerInput } from "@/lib/actions";

export const dynamic = "force-dynamic";

const DASH_EMPTY = ["-", "—", "–"]; // "no value" placeholders → stored as blank

function cell(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && v !== null && "text" in v) return String((v as { text: unknown }).text ?? "");
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

/** Birth date is free text now — accept anything (year only "1990", "05-1990",
 *  "20/05/1990", odd formats…). Excel real-date cells come through as ISO. */
function dobText(v: ExcelJS.CellValue): string | undefined {
  const s = cell(v).trim();
  if (!s || DASH_EMPTY.includes(s)) return undefined;
  return s;
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) return Response.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  const clusterId = String(form.get("clusterId") ?? "");
  if (!(file instanceof File) || !clusterId) return Response.json({ error: "Thiếu file hoặc cụm" }, { status: 400 });

  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await file.arrayBuffer());
    const ws = wb.worksheets[0];
    if (!ws) return Response.json({ error: "File không có sheet nào" }, { status: 400 });

    const rows: PlayerInput[] = [];
    ws.eachRow((row, idx) => {
      if (idx === 1) return; // header
      const c = (n: number) => cell(row.getCell(n).value);
      const full_name = c(1);
      const phone = c(2);
      if (!full_name && !phone) return; // truly empty row
      rows.push({ row: idx, full_name, phone, aoe_nickname: c(3), birth_date: dobText(row.getCell(4).value), citizen_id: c(5), address: c(6), facebook_url: c(7) });
    });

    if (rows.length === 0) return Response.json({ error: "File không có dòng dữ liệu nào (đã bỏ dòng tiêu đề). Kiểm tra lại cột A (Họ tên) và B (SĐT)." }, { status: 400 });

    const res = await importPlayers(clusterId, rows);
    if (!res.ok) return Response.json({ error: res.error }, { status: 400 });
    return Response.json({ inserted: res.inserted, skipped: res.skipped, errors: res.errors });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Lỗi đọc file" }, { status: 400 });
  }
}
