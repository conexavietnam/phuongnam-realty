# Quản trị: ô nhập số, danh mục tin tức, menu

Tài liệu cho người quản trị và người kiểm thử. Mỗi mục có checklist kiểm tra bằng tay.

## 1. Ô nhập số có dấu chấm

Mọi ô số trong trang quản trị (giá, diện tích, số phòng, cận giá của bộ lọc) hiển thị theo kiểu Việt Nam: dấu chấm `.` ngăn cách hàng nghìn, dấu phẩy `,` là dấu thập phân. Gõ `3500000000` sẽ thấy `3.500.000.000`. Dữ liệu lưu vẫn là số thật (không đổi mô hình dữ liệu, không cần di chuyển dữ liệu cũ).

| Ô | Đơn vị lưu | Số thập phân |
|-|-|-|
| BĐS chuyển nhượng: Giá trị số | VNĐ đầy đủ (4500000000) | 0 |
| BĐS chuyển nhượng: Diện tích | m² | 2 |
| BĐS chuyển nhượng: Phòng ngủ, Phòng tắm | số phòng (tối đa 99) | 0 |
| Tin ký gửi: Giá | tỷ VNĐ (4,5) | 3 |
| Tin ký gửi: Diện tích, Phòng ngủ, Phòng tắm | m², số phòng | 2, 0, 0 |
| Cài đặt > Form: Mức giá từ/đến | tỷ VNĐ | 3 |

Các ô `priceFrom`, `bedrooms`, `area` của Dự án là chữ tự do (ví dụ "3,5 tỷ/căn", "1 - 3 PN"), không phải ô số, nên không đổi. Chưa có ô số "số tầng" nào trong dữ liệu.

Cách gõ và dán:

- Chỉ nhận chữ số. Không nhận dấu trừ. Chữ khác bị bỏ qua.
- Ô số nguyên: gõ `.` hoặc `,` bị bỏ qua (dấu chấm hàng nghìn tự chèn lại).
- Ô có phần thập phân: gõ `.` hoặc `,` đều thành dấu phẩy thập phân, chỉ một dấu, quá số chữ số cho phép thì bỏ.
- Con trỏ giữ đúng chỗ khi sửa giữa chuỗi.
- Dán: `3.500.000.000`, `3500000000`, `1 234 567 ₫` đều cho `3.500.000.000`, `3.500.000.000`, `1.234.567`. `3,5` và `3.5` cho 3,5. `3.500` (đúng 3 chữ số sau một dấu chấm) hiểu là 3500. Có cả `.` và `,` thì dấu đứng sau cùng là dấu thập phân. Làm tròn theo số thập phân của ô.
- Rời ô: giá trị nhỏ hơn mức tối thiểu được nâng lên mức tối thiểu; chuỗi được viết lại chuẩn (`3,50` thành `3,5`).

Dòng đọc giá dưới ô tiền: `= 3,5 tỷ đồng`, `= 850 triệu đồng`, `= 3 tỷ 256 triệu 700 nghìn đồng`. Cảnh báo vàng (không chặn lưu) khi giá dưới 1 triệu hoặc trên 1.000 tỷ, hoặc diện tích trên 100.000 m².

Nút **Tự tạo từ giá** (cạnh ô giá hiển thị) điền chữ như `3,5 tỷ` từ giá số; chỉ bấm được khi ô giá hiển thị đang trống và giá số lớn hơn 0.

Bảng quản trị hiển thị `3.500.000.000 ₫`, `85,5 m²`.

Checklist:

- [ ] Gõ 3500000000 vào Giá trị số: hiện `3.500.000.000`, dòng đọc `= 3,5 tỷ đồng`.
- [ ] Đặt con trỏ sau chữ số đầu, gõ `9`: con trỏ ở sau số 9, giá trị `39.500.000.000`.
- [ ] Gõ `500000`: hiện cảnh báo vàng dưới 1 triệu.
- [ ] Diện tích: gõ `85.5` hiện `85,5`; lưu xong bảng hiện `85,5 m²`.
- [ ] Xóa Mức giá hiển thị, bấm Tự tạo từ giá: ra `3,5 tỷ`.
- [ ] Lưu rồi mở lại: số không đổi, kiểu dữ liệu vẫn là số.

## 2. Tin tức: danh mục, tác giả, ngày đăng, thời gian đọc

Tab **Tin tức** có hai tab con: **Bài viết** và **Danh mục**.

### Danh mục

Bảng danh mục cho thêm, sửa, xóa, đổi thứ tự (mũi tên), xem số bài mỗi danh mục. Quy tắc:

- Tên tối đa 60 ký tự, không trùng tên; đường dẫn (slug) tự tạo từ tên, sửa được, chỉ gồm `a-z 0-9 -`, không trùng; mô tả tối đa 300 ký tự; SEO tiêu đề/mô tả tùy chọn. Tối đa 40 danh mục.
- Đổi slug hoặc tên: các bài viết thuộc danh mục tự theo. Link cũ `/tin-tuc/danh-muc/<slug-cu>` không còn dùng được (không có chuyển hướng 301 cho danh mục).
- Xóa danh mục đang có bài: bắt buộc chọn danh mục khác để chuyển bài sang. Danh mục không có bài xóa thẳng.
- Dữ liệu danh mục cũ trong bài (slug không còn trong danh sách) vẫn hiển thị bằng nhãn đã lưu, không có link.

### Soạn bài

- **Danh mục**: chọn trong danh sách, hoặc `+ Tạo danh mục nhanh` (tạo và chọn ngay).
- **Tác giả**: gõ tự do, gợi ý các tên đã dùng.
- **Ngày giờ đăng**: chọn ngày giờ theo giờ Việt Nam (GMT+7); lưu dạng ISO (UTC). Nút `Đặt là bây giờ`. Dữ liệu cũ chỉ có ngày được hiểu là 00:00 giờ Việt Nam.
- **Thời gian đọc**: mặc định `Tự tính` theo số từ trong bài (200 từ/phút, tối thiểu 1 phút). Bỏ chọn để nhập số phút tự đặt. Bài cũ có số phút khác kết quả tự tính được mở ở chế độ tự đặt để giữ nguyên.
- Đường dẫn bài không được là `danh-muc` (giữ cho trang danh mục); trình soạn và máy chủ đều chặn.

### Trang công khai

- `/tin-tuc`: các tab lọc `Tất cả (n)`, `<Danh mục> (n)`; tab là link thật. Danh mục không có bài ẩn khỏi tab.
- `/tin-tuc/danh-muc/<slug>`: trang riêng của danh mục (máy tính và điện thoại), có breadcrumb, phân trang 8 bài. Danh mục không tồn tại là trang 404.
- Thẻ bài và trang chi tiết có nhãn danh mục bấm được; trang chi tiết có breadcrumb qua danh mục.
- Ngày hiển thị theo giờ Việt Nam.

Checklist:

- [ ] Thêm danh mục "Pháp lý", slug tự ra `phap-ly`; tạo trùng tên bị báo lỗi.
- [ ] Đổi slug danh mục đang có bài: cảnh báo hiện số bài; bài vẫn nằm trong danh mục.
- [ ] Xóa danh mục có bài: nút bị khóa tới khi chọn danh mục nhận bài.
- [ ] Soạn bài: tạo danh mục nhanh, chọn tác giả đã dùng, đổi giờ đăng, bật/tắt Tự tính.
- [ ] Đặt slug bài là `danh-muc`: bị từ chối.
- [ ] `/tin-tuc/danh-muc/<slug>` hiện đúng bài; `/tin-tuc/danh-muc/khong-co` là 404.
- [ ] Xem nguồn trang danh mục (curl): có `<title>`, canonical, JSON-LD `CollectionPage` và `BreadcrumbList`, danh sách link bài (tối đa 30); `sitemap.xml` có URL danh mục; danh mục trống là `noindex` và không vào sitemap.

## 3. Menu (Cài đặt > Menu)

Thứ tự tab Cài đặt: Thông tin Website, Form, **Menu**, Chân trang, SEO, Bảo mật.

Hai khối:

- **Menu website (desktop + drawer mobile)**: tối đa 10 mục, mỗi mục tối đa 12 menu con (một cấp). Mỗi mục: tên (tối đa 40 ký tự), đường dẫn, ẩn/hiện, mở tab mới, lên/xuống, xóa. Chọn `Chọn liên kết nhanh` để điền đường dẫn từ trang có sẵn, danh mục tin, dự án, BĐS chuyển nhượng, tin ký gửi đang đăng (điền cả tên nếu đang trống).
- **Thanh menu dưới (mobile)**: tối đa 5 mục, thêm biểu tượng (danh sách cố định: Home, Building2, Send, Newspaper, Phone, Mail, MapPin, Search, Heart, User, Info, Handshake, Key, Landmark).

Đường dẫn hợp lệ: nội bộ bắt đầu bằng `/` (không `//`, không dấu `\`), `https://...`, `mailto:...`, `tel:...`. Không nhận `javascript:`, `data:`, `http://`. Máy chủ (HTTP 422), trình soạn và lúc hiển thị đều kiểm tra như nhau; mục sai không hiển thị.

Có xem trước thanh đầu trang (bấm mục có mũi tên để xem menu con) và thanh dưới. **Lưu menu** lưu ngay, website cập nhật không cần tải lại; nếu máy chủ từ chối, bản nháp quay về dữ liệu đã lưu. **Khôi phục mặc định** có ở từng khối (cần bấm Lưu để áp dụng). Chân trang không bị ảnh hưởng.

Trên website:

- Máy tính: mục có menu con có nút mũi tên; mở bằng rê chuột, bấm, hoặc bàn phím (Enter/Space trên nút; ArrowDown vào danh sách; ArrowUp/ArrowDown/Home/End di chuyển; Escape đóng và trả tiêu điểm về nút). Đổi trang tự đóng. Mục cha sáng khi trang con đang mở.
- Điện thoại: menu trượt hiển thị menu con dạng xổ ra (accordion).
- Thanh dưới lấy từ dữ liệu, bỏ mục ẩn.
- Menu trỏ tới trang không tồn tại vẫn hiển thị (khách thấy 404).
- Sitemap và SEO shell không phụ thuộc menu.

Dữ liệu cũ dạng `{label, path}` vẫn chạy; lần lưu đầu tiên thêm `id` cho từng mục.

Checklist:

- [ ] Thêm menu con "Thị trường" cho "Tin tức" bằng liên kết nhanh; lưu; mở trang chủ: rê chuột thấy menu con.
- [ ] Nhập `javascript:alert(1)` làm đường dẫn: báo lỗi, không lưu được.
- [ ] Ẩn một mục: biến mất khỏi menu và drawer mobile.
- [ ] Bàn phím: Tab tới mũi tên, ArrowDown, Escape.
- [ ] Điện thoại 375px: menu trượt xổ menu con; thanh dưới đúng mục và biểu tượng.
- [ ] Ngắt mạng rồi bấm Lưu menu: báo lỗi, bản nháp quay lại bản cũ.

## 4. Kiểm thử tự động

```bash
node scripts/check-numbers.mjs     # định dạng số, con trỏ, dán, đọc giá
node scripts/check-news-menu.mjs   # thời gian đọc, ngày GMT+7, danh mục, quy tắc link và menu
node scripts/check-seo.mjs         # quy tắc SEO (gồm trang danh mục)
bash server/tests/smoke.sh         # máy chủ: kiểm tra dữ liệu, SEO shell, sitemap (cần PHP 8.3)
```
