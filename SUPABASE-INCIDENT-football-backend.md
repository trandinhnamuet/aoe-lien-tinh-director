# Sự cố mất kết nối Supabase — football-backend (tối 24/06/2026)

> Tài liệu độc lập để gửi cho Claude Code ở project `football-backend` (server `103.28.33.163`, pm2 id 0). Không thuộc codebase aoe-lien-tinh.

## 1. Triệu chứng
- App: `football-backend` (NestJS, dùng thư viện **`pg` / `pg-pool`**), chạy qua pm2 id 0, port 3005.
- Trong `~/.pm2/logs/football-backend-error-0.log`, **lúc 22:24:33 ngày 24/06/2026** xuất hiện một loạt lỗi:
  ```
  Error: Connection terminated due to connection timeout
      at Client._connectionCallback (.../node_modules/pg-pool/index.js:276:17)
  [cause]: Error: Connection terminated unexpectedly
      at Connection.<anonymous> (.../node_modules/pg/lib/client.js:180:73)
  ```
- **Sáng cùng ngày (09:41)** app vẫn chạy bình thường (`[SyncService] Stats sync complete: 26 updated`).
- **Không có code nào thay đổi** giữa hai mốc đó.

## 2. Nguyên nhân gốc
DB dùng **Supabase shared pooler**: host `aws-1-ap-southeast-1.pooler.supabase.com` (vùng Singapore, **Pooler V2**). Một project khác cùng tài khoản Supabase (khác database, cùng pooler vùng này) **cũng dính cùng lúc tối nay** → vấn đề ở tầng pooler của Supabase, không phải app.

Tối 24/06 (~22:24) pooler vùng `ap-southeast-1` bị gián đoạn (Supabase đang rollout Pooler V2 trong tháng 6/2026) → kết nối bị timeout / bị ngắt đột ngột.

**Yếu tố IPv6 (quan trọng cho các project khác):** Pooler V2 quảng bá thêm bản ghi **IPv6**. Node.js mặc định **ưu tiên IPv6**. Trên máy/mạng CÓ IPv6 nhưng không route được tới Supabase → Node treo đến `CONNECT_TIMEOUT` **kéo dài, không tự hết** (đây chính là điều đã xảy ra với project sister chạy local — đã fix bằng cách ép IPv4).
→ Riêng **server này KHÔNG có IPv6** (DNS chỉ trả IPv4, không có default route IPv6), nên không dính yếu tố IPv6 — chỉ bị **đợt gián đoạn pooler ngắn lúc 22:24** và đã tự hồi.

## 3. Hiện trạng khi kiểm tra (sau sự cố)
- 3 IP của pooler (`13.213.241.248`, `3.1.167.181`, `54.179.210.0`) đều **thông TCP** ở cả `:6543` và `:5432`.
- Test kết nối `pg` trực tiếp từ server → **`DB OK NOW`** (đã kết nối lại được).
- App HTTP còn sống (`localhost:3005` trả 404 ở `/`, bình thường với API).
- **Không có lỗi mới sau 22:24:33.**

→ Sự cố mang tính **tạm thời (transient)** và đã hồi phục. Nếu app vẫn còn lỗi, nhiều khả năng pool còn giữ client kẹt từ lúc 22:24 → **`pm2 restart 0`** là hết.

## 4. Vì sao "trước không bị, tối nay tự nhiên bị"
Vì **Supabase thay đổi/sự cố hạ tầng pooler (V2) tối nay**, không phải do code. Cùng một sự kiện gây 2 biểu hiện:
- Project chạy **local có IPv6** → treo kéo dài do Node ưu tiên IPv6 (fix: ép IPv4).
- **Server football (không IPv6)** → chỉ dính đợt gián đoạn pooler ngắn, đã tự hồi.

## 5. Khuyến nghị fix (làm football-backend bền hơn với sự cố pooler)
1. **Ép IPv4** (phòng khi server có IPv6, hoặc pooler thêm lại AAAA) — thêm ở **đầu `src/main.ts`, trước mọi import khác**:
   ```ts
   import dns from "node:dns";
   dns.setDefaultResultOrder("ipv4first");
   ```
   Hoặc đặt trong pm2 env rồi restart:
   ```
   NODE_OPTIONS="--dns-result-order=ipv4first"  →  pm2 restart 0 --update-env
   ```
2. **Bắt buộc có handler lỗi cho pg Pool** (idle client bị pooler ngắt sẽ emit 'error'; thiếu handler dễ crash/spam log):
   ```ts
   pool.on("error", (err) => logger.error("PG idle client error", err));
   ```
   - Nếu dùng **TypeORM**: bật `retryAttempts` (vd 10), `retryDelay` (vd 3000), `keepConnectionAlive: true`, `extra: { max: 10, connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000, keepAlive: true }`.
3. **Cấu hình pool chịu lỗi**: `connectionTimeoutMillis ~10000`, `idleTimeoutMillis`, `max` hợp lý, `keepAlive: true`, `ssl: { rejectUnauthorized: false }` (Supabase) / `sslmode=require`.
4. **Sau sự cố**: `pm2 restart 0` để pool lấy kết nối mới (loại bỏ client kẹt).
5. (Tùy chọn) Cân nhắc dùng **session pooler `:5432`** thay vì transaction `:6543` nếu hay rớt; hoặc thêm **retry/backoff** khi connect lần đầu lúc khởi động.

## 6. Thông tin môi trường (đã xác minh trên server)
- Node `v22.23.0`, NestJS, `pg`/`pg-pool`.
- `.env` dùng biến tách rời: `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` (không phải `DATABASE_URL` gộp), `PORT=3005`, `PLAYER_DATA_URL`, `STATS_DATA_URL`, `ADMIN_PASSWORD`.
- Server không có IPv6.
- DB host: `aws-1-ap-southeast-1.pooler.supabase.com` (Supabase pooler V2, ap-southeast-1).
