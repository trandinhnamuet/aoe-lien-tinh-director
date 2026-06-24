# Brief thiết kế UI — AoE Liên Tỉnh Director

> **Dùng file này làm prompt cho Claude Design.** Đây là bản thiết kế giao diện
> tham khảo (UI mẫu) — không cần kết nối dữ liệu thật, hãy dùng **mock data** sát
> thực tế cho mọi màn hình.

---

## 0. Hướng dẫn cho Claude Design (đọc kỹ)

- **KHÔNG hỏi lại tôi để xác nhận thêm.** Mọi yêu cầu cần thiết đã có trong file
  này. Chỗ nào thiếu, hãy **tự đưa ra giả định hợp lý** và làm tiếp, ghi chú ngắn
  gọn giả định đó trong phần mô tả.
- **Bước 1 — Đề xuất phong cách:** trước khi dựng chi tiết, hãy trình bày **3
  hướng phong cách (style direction) khác biệt rõ rệt** (mỗi hướng kèm: bảng màu,
  typography, mô tả tinh thần, và 1–2 màn hình tiêu biểu để hình dung). Gợi ý 3
  hướng (có thể thay nếu bạn có ý hay hơn, nhưng phải đủ khác biệt):
  1. **Esports Broadcast** — nền tối, màu neon tương phản mạnh, năng lượng cao,
     tối ưu cho livestream/màn hình lớn.
  2. **Premium Tournament** — sạch sẽ, sang trọng, nhiều khoảng trắng, điểm nhấn
     ánh kim (vàng/đồng), kiểu tạp chí thể thao cao cấp.
  3. **Age of Empires Themed** — cảm hứng đế chế/trung cổ: chất liệu giấy da,
     đá, huy hiệu, viền hoa văn, tông màu trầm ấm.
- **Bước 2 — Sau khi tôi chốt 1 hướng**, dựng đầy đủ tất cả màn hình ở mục 3–4
  theo phong cách đó, thống nhất design system.
- Toàn bộ chữ trên giao diện dùng **tiếng Việt** (có dấu).

---

## 1. Bối cảnh sản phẩm (tóm tắt)

Công cụ tổ chức giải đấu **AoE solo 1‑1**. Một *giải đấu tổng* (hằng năm) gồm
nhiều *cụm thi đấu* (theo tỉnh/khu vực, mỗi cụm 1 ngày). Mỗi cụm thi đấu qua
nhiều *vòng*, mỗi vòng thuộc 1 trong 4 loại: **chia bảng**, **nhánh thắng thua
(Swiss)**, **loại trực tiếp chọn nhiều**, **loại trực tiếp tìm vô địch
(bracket)**. Mỗi *cặp đấu* có 2 game thủ, mỗi người 1 **số máy** (vị trí ngồi ở
quán net) và 1 tỉ số.

Có **2 nhóm giao diện**:
- **Cổng public** — khán giả/game thủ/BLV theo dõi tình hình giải đấu realtime.
- **Trang admin** — BTC quản lý giải, cụm, game thủ, thể thức, xếp cặp, nhập kết
  quả.

---

## 2. Yêu cầu chung & Design System

### Responsive
- **Cổng public**: ưu tiên màn hình lớn (TV/livestream) **và** mobile (game thủ
  tra cứu nhanh "mình đánh máy nào, gặp ai"). Phải đẹp ở cả hai.
- **Trang admin**: ưu tiên desktop (thao tác bảng biểu, kéo thả), nhưng không vỡ
  trên tablet.

### Background cổng public (bắt buộc)
- Dùng ảnh `public/background-2.jpg` làm nền trang public.
- **Hiển thị full width, giữ nguyên tỉ lệ ảnh**, cho phép scroll dọc **ít nhất
  đến hết chiều dài ảnh nền**. Nội dung đặt nổi phía trên nền (cân nhắc lớp phủ
  mờ/gradient để chữ luôn đọc rõ).

### Thành phần chung
- Header có: logo/tên giải, **bộ chọn Giải tổng → Cụm**, trạng thái cập nhật
  realtime (vd "Đang cập nhật trực tiếp").
- Trạng thái rõ ràng: game thủ **đang thi đấu / đã đi tiếp / đã bị loại** phân
  biệt bằng màu + nhãn. Cặp đấu **chưa đánh / đang đánh / đã xong** phân biệt rõ.
- Thanh tiến độ cụm: "X/Y cặp đã có kết quả", số cặp đang đánh.
- Empty state, loading skeleton, error state cho mọi danh sách.

### ⭐ Animation (yêu cầu trọng tâm — làm thật ấn tượng)
1. **Khi load trang (public):** hiệu ứng xuất hiện gây ấn tượng — ví dụ các thẻ
   cặp đấu xếp tầng (staggered reveal), **đường nối bracket vẽ dần (line draw)**,
   số liệu đếm tăng (count‑up), nền hơi parallax. Mượt, không giật.
2. **Khi 1 trận được cập nhật tỉ số (realtime):** thẻ trận đó **bật sáng/pulse**,
   tỉ số **lật/đếm động** sang giá trị mới, đánh dấu người thắng (glow + huy
   hiệu). Khi 1 trận **kết thúc**: hiệu ứng nổi bật (confetti/flash nhẹ) và người
   thắng "đi tiếp" trượt sang vị trí vòng sau trong bracket.
3. Chuyển vòng / chuyển cụm: transition mượt (fade/slide).
4. Tôn trọng `prefers-reduced-motion`: giảm/tắt animation khi người dùng yêu cầu.

---

## 3. Màn hình CỔNG PUBLIC

### P1. Tổng quan cụm hiện tại (Landing / Dashboard)
- Mục đích: nhìn 1 phát thấy ngay tình hình cụm đang diễn ra.
- Nội dung:
  - Header: tên giải tổng + tên cụm + ngày + địa điểm + badge "Đang thi đấu".
  - **Thanh tiến độ vòng hiện tại**: tên vòng, X/Y cặp xong, n cặp đang đánh.
  - **Lưới các cặp đấu của vòng hiện tại**: mỗi thẻ gồm 2 game thủ (nickname +
    số máy), tỉ số, trạng thái (chưa đánh/đang đánh/xong), highlight người thắng.
  - Khối điều hướng nhanh tới từng vòng (P3/P4/P5).
- Là nơi animation load & realtime score thể hiện rõ nhất.

### P2. Bộ chọn Giải & Cụm (component dùng chung ở public)
- Cho chọn **cụm đang thi đấu** và **các cụm đã thi đấu** của **giải tổng hiện
  tại**. KHÔNG hiển thị giải tổng khác, KHÔNG hiển thị cụm chưa thi đấu.
- Dạng dropdown/tab gọn trên header.

### P3. Vòng quần chiến — Nhánh thắng thua (Swiss)
- Hiển thị theo **từng lượt** (Lượt 1, 2, 3…). Số lượt là cố định theo cấu hình
  (vd thắng 2 lượt để đi tiếp ⇒ 3 lượt) — chỉ hiển thị, không cho sửa.
- Mỗi lượt: danh sách cặp đấu (2 game thủ + số máy + tỉ số). Hiện rõ **hiệu số
  hiện tại** của mỗi game thủ (vd 1‑0, 0‑1) để hiểu cách ghép cặp.
- Bảng/khu vực tổng kết: ai đã **đủ thắng để đi tiếp**, ai đã **bị loại**.

### P4. Vòng bảng (Group stage)
- Lưới các **bảng** (Bảng A, B, C…). Mỗi bảng là 1 thẻ gồm:
  - **Bảng xếp hạng**: hạng, nickname, số máy, số trận thắng, hiệu số. Tô đậm 2
    game thủ đầu bảng (đi tiếp).
  - Danh sách các cặp đấu vòng tròn trong bảng + tỉ số.
- Cập nhật realtime: khi 1 trận trong bảng có kết quả → bảng xếp hạng tự sắp xếp
  lại với animation đổi thứ hạng (re-order).

### P5. Vòng loại trực tiếp (Knockout bracket)
- Sơ đồ **cây bracket** từ vòng đầu tới chung kết, có **trận tranh 3–4**.
- Mỗi nút trận: 2 game thủ + số máy + tỉ số; người thắng nối sang trận sau bằng
  đường line. Trận chung kết nổi bật (cúp/vô địch).
- Hỗ trợ cả loại **"chọn nhiều"** (1 lượt chia cặp, winners đi tiếp — hiển thị
  dạng lưới cặp) và **"tìm vô địch"** (bracket cây đầy đủ).
- Animation: đường bracket vẽ dần khi load; người thắng trượt sang vòng sau khi
  có kết quả.

---

## 4. Màn hình TRANG ADMIN

> Sau khi xác thực, admin có sidebar/menu điều hướng giữa các trang dưới đây.

### A1. Đăng nhập (Password gate)
- 1 ô nhập mật khẩu chung + nút vào. Chỉ hỏi **lần đầu trên mỗi thiết bị** (sau
  đó lưu localStorage). Thiết kế đơn giản, có brand giải đấu.

### A2. Admin Dashboard
- Tổng quan: giải tổng & cụm đang chọn, tiến độ cụm hiện tại, số game thủ còn
  thi đấu/đã loại, link nhanh tới các tác vụ (nhập kết quả, xếp cặp…).

### A3. Quản lý Giải đấu tổng
- Danh sách giải tổng (tên, năm, số cụm). CRUD: tạo/sửa/xóa.

### A4. Quản lý Cụm thi đấu
- Danh sách cụm của 1 giải (tên, địa điểm, ngày, trạng thái draft/đang/đã thi
  đấu). CRUD. Đặt **trạng thái** cụm và **đặt cụm hiện tại** hiển thị ở public.

### A5. Thể thức & Cấu hình vòng (Round builder)
- Quản lý **bộ thể thức mẫu** (Thể thức A/B/C…) để áp nhanh cho cụm.
- **Trình dựng vòng cho cụm**: thêm/xóa/sắp xếp các vòng; mỗi vòng chọn 1 trong
  4 loại và cấu hình tham số:
  - *Chia bảng*: hệ thống **đề xuất các phương án chia bảng** (số bảng là lũy
    thừa của 2, mỗi bảng 3–6 người) để admin **chọn 1**; số người đi tiếp mỗi
    bảng; số chạm vòng tròn.
  - *Nhánh thắng thua (Swiss)*: số chạm mỗi trận, **số lượt-thắng để đi tiếp**;
    UI **tự hiển thị số lượt** suy ra (không cho sửa số lượt).
  - *Loại trực tiếp chọn nhiều*: số chạm.
  - *Loại trực tiếp tìm vô địch*: số chạm vòng thường, số chạm chung kết, bật/tắt
    trận tranh 3–4 (input phải là lũy thừa của 2 — cảnh báo nếu không hợp lệ).

### A6. Nhập danh sách game thủ
- 2 cách: **nhập tay** (form từng game thủ) và **import Excel**.
- Có nút **tải file Excel mẫu**. Bảng game thủ với các cột: họ tên*, sđt*,
  nickname, ngày sinh, CCCD, địa chỉ, facebook. (* = bắt buộc).
- Hiển thị lỗi import (thiếu trường bắt buộc, trùng CCCD nếu bật kiểm tra).

### A7. Xếp cặp & Chia bảng (Random)
- Với vòng loại trực tiếp / quần chiến: nút **"Random ghép cặp"** — bấm được
  **nhiều lần liên tục**, mỗi lần ra 1 phương án; admin xem rồi bấm **"Chốt
  phương án này"** để lưu. Thể hiện rõ đây là bản nháp cho tới khi chốt.
- Với vòng bảng: bốc thăm chia game thủ vào các bảng theo phương án đã chọn ở A5.
- Cho gán/sửa **số máy** cho từng game thủ trong mỗi cặp.
- Animation xáo trộn/đổ cặp khi random cho cảm giác "bốc thăm".

### A8. Cập nhật kết quả trận đấu
- Danh sách cặp đấu của vòng/lượt đang diễn ra; nhập **tỉ số** từng cặp, chọn
  người thắng, đổi trạng thái (đang đánh/xong). Lưu là public cập nhật realtime.
- Thao tác nhanh, tối thiểu số lần click (nhập điểm bằng phím +/−).

### A9. Cài đặt (Settings)
- Bật/tắt **kiểm tra trùng CCCD** khi nhập game thủ (mặc định **tắt**).
- Chọn **giải tổng hiện tại** và **cụm hiển thị mặc định** cho cổng public.

---

## 5. Tông & cảm xúc mong muốn
Chuyên nghiệp như một giải esports thật, đủ "đã mắt" để lên sóng livestream,
nhưng thông tin phải **rõ ràng, dễ đọc từ xa**. Animation tạo cảm giác kịch tính
mỗi khi có kết quả mới, nhưng không làm rối hay che mất thông tin.
