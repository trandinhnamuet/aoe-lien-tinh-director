import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { isAdmin } from "@/lib/auth";
import { importPlayers, type PlayerInput } from "@/lib/actions";

export const dynamic = "force-dynamic";

function cell(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && v !== null && "text" in v) return String((v as { text: unknown }).text ?? "");
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

/** Parse a birth-date cell. Accepts dd-mm-yyyy, dd/mm/yyyy, yyyy-mm-dd, or an Excel date cell.
 *  Returns yyyy-mm-dd (DB format) or undefined if blank/unrecognized. */
function parseDob(v: ExcelJS.CellValue): string | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  if (v instanceof Date) {
    const y = v.getUTCFullYear(), m = String(v.getUTCMonth() + 1).padStart(2, "0"), d = String(v.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = cell(v).trim();
  if (!s) return undefined;
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return undefined;
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
      if (!full_name && !phone) return;
      rows.push({ full_name, phone, aoe_nickname: c(3), birth_date: parseDob(row.getCell(4).value), citizen_id: c(5), address: c(6), facebook_url: c(7) });
    });

    const res = await importPlayers(clusterId, rows);
    if (!res.ok) return Response.json({ error: res.error }, { status: 400 });
    return Response.json({ inserted: res.inserted, skipped: res.skipped });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Lỗi đọc file" }, { status: 400 });
  }
}
