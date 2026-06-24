import ExcelJS from "exceljs";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const HEADERS = ["Họ tên *", "Số điện thoại *", "Nickname AoE", "Ngày sinh (dd-mm-yyyy)", "CCCD", "Địa chỉ", "Facebook"];

export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "unauthorized" }, { status: 401 });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Game thủ");
  ws.columns = HEADERS.map((h) => ({ header: h, width: Math.max(16, h.length + 4) }));
  ws.getRow(1).font = { bold: true };
  ws.addRow(["Nguyễn Văn An", "0901234567", "Cuồng Phong", "12-05-1998", "034098000123", "Lê Chân, Hải Phòng", "fb.com/cuongphong"]);
  ws.addRow(["Trần Quốc Bảo", "0907654321", "Hắc Long", "", "", "", ""]);

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="mau-game-thu.xlsx"',
    },
  });
}
