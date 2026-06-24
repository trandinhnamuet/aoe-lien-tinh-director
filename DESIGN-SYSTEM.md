# Quy chuẩn thiết kế UI — AoE Liên Tỉnh Director

> **Hướng 4 — "Official Key Art"**, bám sát poster chính thức (CSDN Studio): vũ trụ chàm–tím, chrome xanh băng, sấm sét, đấu trường đá.
> Dùng file này làm nguồn chân lý khi dựng bất kỳ màn hình mới nào (public hoặc admin) để UI đồng nhất.

---

## 1. Nguyên tắc cốt lõi

1. **Nền tối, ánh sáng phát ra từ điểm nhấn.** Mặt nền luôn là chàm rất tối (`#080b1e` → `#0a0e24`); màu sống động chỉ xuất hiện ở viền, glow, chữ thắng cuộc, thanh tiến độ.
2. **Xanh băng (ice blue) là màu thương hiệu.** `#5db6ff` cho mọi trạng thái "đang sống": live, thắng, link active, CTA. Tím `#8a5cff` chỉ làm màu phụ trong gradient.
3. **Chữ tiêu đề luôn nghiêng, in hoa, nén.** `Saira Condensed` italic 800 — gợi tốc độ & khí thế esports. Không bao giờ dùng cho body.
4. **Glow có chủ đích, không lạm dụng.** Chỉ glow phần tử "sống" (live/thắng/CTA). Phần tử tĩnh dùng viền mảnh `rgba(93,182,255,.16)`.
5. **Chuyển động kể chuyện trận đấu.** Reveal so le khi vào, pulse khi đang đánh, flash + confetti khi chốt kết quả. Luôn tôn trọng `prefers-reduced-motion`.
6. **Mọi spacing/màu là literal nội tuyến** (dự án dùng Design Components — style inline, không CSS class/biến token).

---

## 2. Bảng màu

### Nền (dark, warm-cool indigo)
| Vai trò | HEX | Dùng cho |
|---|---|---|
| Nền sâu nhất | `#080b1e` | `body`, nền trang |
| Nền panel tối | `#0a0e24` | đáy gradient, scrollbar track |
| Sidebar / surface tối | `#0b0f28` | sidebar admin |
| Dropdown / popover | `#0e1336` | menu nổi |
| Gradient hero (đỉnh) | `#2a1c5e` → `#131140` → `#0a0e24` | `radial-gradient(130% 90% at 50% -20%, …)` |

### Xanh băng — thương hiệu (ice blue)
| Vai trò | HEX |
|---|---|
| Primary / live / thắng | `#5db6ff` |
| Sáng (chữ gradient, hover) | `#9bd8ff` |
| Rất sáng (đỉnh gradient text) | `#bfe2ff` |
| Đậm (đáy gradient nút/logo) | `#3f7fe0` |
| Chữ trên nền sáng (CTA text) | `#0a1c44` |

### Tím phụ (accent, chỉ trong gradient)
| Vai trò | HEX |
|---|---|
| Tím điện | `#8a5cff` |
| Tia sét tím | `#cdb9ff` |

### Chữ & trung tính
| Vai trò | HEX |
|---|---|
| Chữ chính | `#e8eeff` |
| Chữ trắng nhấn | `#ffffff` |
| Chữ phụ (muted) | `#8a96c0` |
| Chữ mờ / mono label | `#7e8cc8` |
| Chữ rất mờ / footer | `#5a648c` |
| Người thua / disabled | `#6675a6` |

### Ngữ nghĩa (semantic)
| Trạng thái | Màu | Ghi chú |
|---|---|---|
| Live / đang đánh | `#5db6ff` + glow | pulse |
| Đã xong / thắng | `#5db6ff` | có text-shadow glow |
| Chờ / pending | `#7e8cc8` | viền nét đứt |
| Đã loại / thua | `#6675a6` | opacity 0.5 trên hàng |
| Cảnh báo | `#ffce6b` trên `rgba(255,206,107,.08)` | viền `rgba(255,206,107,.3)` |
| Nguy hiểm / xóa | `#ff8fa8` trên viền `#4a2230` | |

### Gradient chuẩn (copy nguyên văn)
```
/* Logo / CTA / nút primary */
background: linear-gradient(150deg,#9bd8ff,#3f7fe0);
/* CTA sáng hơn */
background: linear-gradient(150deg,#9bd8ff,#5db6ff);
/* Chữ tiêu đề (clip text) */
background: linear-gradient(180deg,#ffffff,#9bd8ff);
-webkit-background-clip: text; background-clip: text; color: transparent;
/* Thanh tiến độ */
background: linear-gradient(90deg,#5db6ff,#8a5cff);
/* Nền hero tối */
background: radial-gradient(130% 90% at 50% -20%, #2a1c5e 0%, #131140 38%, #0a0e24 78%);
```

---

## 3. Typography

**Ba họ chữ (Google Fonts):**
```
Saira Condensed  — 500/600/700/800 (+ italic) → tiêu đề, tỉ số, tên người chơi, CTA
IBM Plex Sans    — 400/500/600              → body, nhãn, nội dung
IBM Plex Mono    — 400/500/600              → mã/MÁY, label kỹ thuật, ngày giờ, badge
```

### Thang chữ
| Token | Font | Size / Weight | Dùng cho |
|---|---|---|---|
| Display | Saira Condensed italic 800 | `clamp(34px,6vw,58px)`, uppercase | tên cụm trên hero |
| H1 trang | Saira Condensed italic 800 | 26px, uppercase | tiêu đề màn admin |
| H2 section | Saira Condensed 700/800 | 20–22px, uppercase | tiêu đề khối, tên vòng |
| Tên người chơi | Saira Condensed 700 | 16–19px | match card |
| Tỉ số | Saira Condensed italic 800 | 22–30px | điểm số |
| Body | IBM Plex Sans 400/500 | 13–15px | mô tả, nội dung |
| Label mono | IBM Plex Mono 600 | 9–11px, letter-spacing 1–2px | nhãn kỹ thuật, mã máy, ngày |

**Quy tắc:** tiêu đề & con số = Saira Condensed (thường italic + uppercase). Mọi thứ "kỹ thuật/máy móc" (MÁY 03, mã A2, ngày, trạng thái mono) = IBM Plex Mono có letter-spacing. Còn lại = IBM Plex Sans.

---

## 4. Spacing, bo góc, viền, đổ bóng

**Spacing** (bội số 4, hay dùng): `4 · 6 · 8 · 10–11 · 14 · 16–18 · 20–22 · 26 · 28`. Padding trang `28px`, padding card `16–22px`, gap lưới `12–14px`.

**Bo góc (radius):**
| px | Dùng cho |
|---|---|
| 4 | khung ngoài cùng (showcase frame) |
| 6–7 | input nhỏ, chip mono, badge |
| 8–10 | nút, ô nhỏ, stepper |
| 11–14 | match card, panel, surface chính |
| 16 | hộp login |
| 20–30 | pill / badge bo tròn, toggle |
| 50% | chấm trạng thái, knob |

**Viền:**
- Mặc định tĩnh: `1px solid rgba(93,182,255,.16)`
- Nhấn / active: `1px solid rgba(93,182,255,.35)` → `.5`
- Pending / nháp: `1px dashed #2c3470`
- Phân cách trong bảng: `1px solid rgba(93,182,255,.08)`

**Surface (mặt phẳng) theo độ nổi:**
```
Nền phẳng:      background: rgba(255,255,255,.02);
Card thường:    background: rgba(255,255,255,.03);  border: 1px solid rgba(93,182,255,.16);
Card nhấn/live: background: rgba(93,182,255,.06);   (+ glow / pulse)
Header bảng:    background: rgba(93,182,255,.06);
```

**Đổ bóng & glow:**
```
Bóng CTA:     0 6px 20px rgba(93,182,255,.35);
Glow logo:    0 0 18px rgba(93,182,255,.5);
Glow chữ:     text-shadow: 0 0 12–14px rgba(93,182,255,.6);   /* chỉ chữ thắng/tiêu đề lớn */
Bóng panel nổi: 0 18px 50px rgba(0,0,0,.5);
```

---

## 5. Thành phần (components)

### Nút
- **Primary (CTA):** nền `linear-gradient(150deg,#9bd8ff,#5db6ff)`, chữ `#0a1c44`, Saira Condensed 700 uppercase, radius 10, bóng `0 6px 20px rgba(93,182,255,.35)`.
- **Secondary:** nền `rgba(93,182,255,.08)`, viền `rgba(93,182,255,.4)`, chữ `#bfe2ff`.
- **Ghost / hủy:** nền trong suốt, viền `#2c3470`, chữ `#8a96c0`.
- **Nguy hiểm:** nền trong suốt, viền `#4a2230`, chữ `#ff8fa8`.
- **Stepper +/− (nhập điểm):** 34×34, viền `rgba(93,182,255,.4)`, nền `rgba(93,182,255,.08)`, chữ `#bfe2ff`.

### Chip / Badge
- **Mã máy:** mono 10px `#9bd8ff` trên `rgba(93,182,255,.12)`, radius 4, padding `2px 6px`.
- **"ĐI TIẾP":** mono 9px `#bfe2ff`, viền `rgba(93,182,255,.45)`, radius 4.
- **Pill trạng thái live:** nền `rgba(93,182,255,.12)`, viền `rgba(93,182,255,.5)`, radius 30, có chấm pulse.

### Chấm trạng thái live
```
width:7px; height:7px; border-radius:50%;
background:#5db6ff; box-shadow:0 0 8px #5db6ff;
animation: liveDot 1.4s infinite;
```

### Match card (xem `MatchCard.dc.html`)
- 3 trạng thái: **done** (viền đặc `#242c64`), **live** (nền xanh + pulse glow), **pending** (viền đứt `#2c3470`).
- Người thắng: tên + tỉ số `#5db6ff` có glow; người thua: opacity 0.5.

### Input
```
padding:9–13px; radius:8–10; background:rgba(255,255,255,.05);
border:1px solid #2c3470; color:#fff; outline:none;
/* lỗi: border-color #ff8fa8 */
```

### Toggle (switch)
- Track 52×30 radius 20; bật = gradient `150deg,#9bd8ff,#5db6ff`, tắt = `#2c3470`. Knob trắng 24px trượt trái↔phải.

### Nav item (sidebar admin)
- Active: nền gradient `150deg,#9bd8ff,#5db6ff`, chữ `#0a1c44` 600. Inactive: chữ `#aab6e0`, nền trong suốt. Mỗi item có mã mono (A2, A3…) ở đầu.

### Tab
- Active: chữ `#bfe2ff` 600, gạch chân `2px solid #5db6ff`. Inactive: chữ `#8a96c0`, không gạch.

### Toast
- Đáy giữa màn, nền gradient `150deg,#9bd8ff,#5db6ff`, chữ `#0a1c44` 600, radius 30, bóng `0 10px 30px rgba(93,182,255,.4)`, animation `toastIn`.

---

## 6. Chuyển động (animations)

Khai báo trong `<helmet><style>`; dùng nội tuyến qua thuộc tính `animation`.

| Keyframe | Công dụng |
|---|---|
| `cardIn` | reveal khối (opacity 0→1, translateY 14–18px) — dùng so le `.25s/.35s/.45s` |
| `growX` | thanh tiến độ chạy từ trái (scaleX 0→1) |
| `pulseIce` | viền + glow nhịp cho phần tử "đang đánh" |
| `liveDot` | chấm live nhấp nháy (opacity 1↔.25) |
| `lightning` | tia sét chớp ngẫu nhiên ở nền |
| `scoreFlash` | nháy viền sáng khi tỉ số đổi |
| `drawLine` | vẽ đường nối nhánh bracket (scaleX) |
| `confettiFall` | pháo giấy khi chốt kết quả / vô địch |
| `shuffle` | xáo trộn khi random xếp cặp |
| `toastIn` | toast trượt lên |

**Bắt buộc** kèm:
```css
@media (prefers-reduced-motion: reduce){ *,*::before,*::after{ animation-duration:.001s !important; } }
```
Tắt confetti/lightning khi `prefers-reduced-motion`.

---

## 7. Layout

- **Bề rộng nội dung:** public `max-width:1280px`; admin main `max-width:1240px`, sidebar `248px` cố định.
- **Lưới card:** `grid-template-columns: repeat(auto-fill, minmax(300px,1fr)); gap:14px` (bảng/cặp đấu dùng `minmax(320–360px,1fr)`).
- **Header dính:** `position:sticky; top:0` + `backdrop-filter:blur(12–14px)` + nền `rgba(11,15,40,.9)` + viền đáy `rgba(93,182,255,.14)`.
- **Lớp nền key art:** ảnh `public/background-2.jpg` (`background-size:100% auto; position:top center`) + lớp phủ gradient tối `linear-gradient(180deg, rgba(8,11,30,.72) → .96)` để chữ luôn đọc được. Tia sét là 2 thanh mảnh blur chớp.
- **Bố cục so sánh nhiều phương án:** xếp frame cạnh nhau, label nhỏ phía trên mỗi card; nền xám `#e7e5df`, card trắng radius 2.

---

## 8. Giọng nội dung (tiếng Việt)

- Thuật ngữ giải đấu: **Vòng bảng · Quần chiến (Swiss) · Loại trực tiếp · Tứ kết · Bán kết · Chung kết · Tranh 3–4 · Đi tiếp · Bị loại · Đang đánh · Chờ**.
- Nhãn kỹ thuật ngắn gọn, in hoa khi ở dạng mono: `MÁY 03`, `ĐANG THI ĐẤU`, `TRỰC TIẾP`.
- Tên người chơi dùng biệt danh (nick) làm chính, tên thật/SĐT là phụ.
- **Không** dùng emoji rải rác; chỉ 🏆 cho vô địch và 🎲 cho random là chấp nhận được (đã có trong hệ thống).

---

## 9. Checklist khi dựng màn mới

- [ ] Nền `#080b1e`, chữ `#e8eeff`, font đã import (Saira Condensed + IBM Plex Sans/Mono).
- [ ] Tiêu đề = Saira Condensed italic uppercase; nhãn kỹ thuật = IBM Plex Mono có letter-spacing.
- [ ] Card tĩnh: `rgba(255,255,255,.03)` + viền `rgba(93,182,255,.16)`, radius 11–14.
- [ ] Mọi trạng thái "sống" (live/thắng/CTA) = `#5db6ff` + glow; pending = viền đứt; thua = opacity 0.5.
- [ ] CTA primary = gradient xanh băng, chữ `#0a1c44`.
- [ ] Có reveal `cardIn` so le; phần tử live có `pulseIce` + chấm `liveDot`.
- [ ] Có `@media (prefers-reduced-motion)`.
- [ ] Tái dùng `data.js` (mock data + store realtime) và `MatchCard.dc.html` nếu hiển thị cặp đấu.
