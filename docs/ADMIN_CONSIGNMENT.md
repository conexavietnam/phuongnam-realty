# Admin: Ký gửi (đơn ký gửi -> duyệt -> tin ký gửi)

Website có 3 mục BĐS tách biệt, mỗi mục quản lý riêng trong admin và có nhãn màu riêng trên thẻ:

| Mục (menu) | Đường dẫn | Dữ liệu | Admin | Nhãn thẻ |
|---|---|---|---|---|
| Dự án | `/du-an` | `projects` | tab "Dự án" | Dự án (xanh navy) |
| BĐS chuyển nhượng | `/chuyen-nhuong` | `properties` | tab "BĐS chuyển nhượng" | Chuyển nhượng (xanh da trời) |
| Ký gửi | `/ky-gui`, `/ky-gui/<slug>` | `consignments` | tab "Ký gửi" | Ký gửi (vàng) |

Tab admin theo thứ tự: Tổng quan, Dự án, BĐS chuyển nhượng, Ký gửi, Tin tức, Media, Khách hàng, Cài đặt, Sao lưu.

## Vòng đời

```
Form ký gửi (/ky-gui)                          customer_leads (chỉ admin đọc được)
      |                                                  |
      v                                                  v
   [Mới] --Đang xử lý--> [Đang xử lý] --Duyệt & tạo tin nháp--> [Đã duyệt (nháp)]
      \                        \                                     |
       \--Từ chối (+ghi chú)----+--> [Từ chối] --Mở lại--> Đang xử lý |  soạn bài, ảnh, Lưu
                                                                     v
                                                              [Đã đăng]  <-- Đăng / Gỡ về nháp -->  nháp
                                                                     |
                                                                     v  Đánh dấu đã giao dịch
                                                              [Đã giao dịch]  (vẫn hiển thị, xếp cuối, có nhãn)
```

Trạng thái đơn (`customer_leads.status`): `new`, `processing`, `approved`, `rejected`, `closed`.
"Đã đăng" không lưu riêng: được suy ra từ tin liên kết (`consignmentId`) đang `published`. Đơn `approved` có tin `sold` hiển thị "Đã giao dịch" và được đồng bộ thành `closed`; mở bán lại tin thì đơn quay về `approved`.
Dữ liệu cũ được chuyển khi đọc: `contacted` -> `processing`, `completed` -> `closed`, `cancelled` -> `rejected`.

Trạng thái tin (`consignments.status`): `draft` (nháp, chỉ admin thấy), `published` (đang đăng), `sold` (đã giao dịch). Tin cũ không có `status` được coi là `published`; tin cũ dùng `name`/`category` được đọc thành `title`/`propertyType`.

## Quyền riêng tư
Họ tên và số điện thoại chủ nhà chỉ nằm trong `customer_leads`. Tin ký gửi không bao giờ sao chép chúng. Máy chủ còn lọc lớp thứ hai: người chưa đăng nhập gọi `data&c=consignments` chỉ nhận tin `published`/`sold` và đã bị bỏ mọi khóa bắt đầu bằng `_` hoặc tên `internalNote`, `leadId`, `ownerName`, `ownerPhone`. Trang công khai chỉ hiển thị hotline/Zalo của công ty và form "Liên hệ về tin này" (tạo lead nguồn `contact`).

## Mã nguồn
- `src/components/admin/consignment/`: `ConsignmentTab` (hai tab con), `ApplicationsPanel` (đơn), `ListingsPanel` (tin), `ListingEditorModal`, `LeadStatusControl` (tab Khách hàng).
- `src/services/consignmentService.ts`: lọc công khai, duyệt đơn, lưu tin, đồng bộ trạng thái đơn.
- `src/utils/consignment.ts`: chuẩn hóa dữ liệu cũ, nhãn trạng thái. `server/src/storage.php`: lọc công khai + kiểm tra khi ghi.
- Duyệt đơn tạo tin nháp có id cố định `consign-<id đơn>` nên bấm lại không tạo trùng. Bản nháp lấy khu vực, loại BĐS, khoảng giá (vào "Giá hiển thị", không vào giá số) và ghi chú của khách (vào mô tả ngắn: hãy đọc lại trước khi đăng).

## Checklist kiểm thử thủ công
1. Trang `/ky-gui` (desktop và mobile 375px): chỉ có tin đã đăng, thẻ có nhãn "Ký gửi", giá thiếu hiển thị "Liên hệ"; bộ lọc khu vực/loại/giá/từ khóa đổi URL (`?region=...&type=...&price=...&q=...`) và tải lại giữ nguyên bộ lọc.
2. Gửi form ký gửi (có tên, SĐT): admin thấy đơn mới trong Ký gửi > Đơn chờ xử lý (chấm đỏ trên tab) và trong tab Khách hàng; tổng quan tăng "Đơn ký gửi chờ xử lý".
3. Bấm "Đang xử lý": nhãn đổi, bộ lọc đếm đúng. Sửa ghi chú nội bộ, "Lưu ghi chú", tải lại: ghi chú còn.
4. "Từ chối": nhập lý do, xác nhận: đơn sang Từ chối, ghi chú lưu; "Mở lại" đưa về Đang xử lý.
5. "Duyệt & tạo tin nháp": mở trình soạn thảo đã điền sẵn tiêu đề, loại, khu vực, giá hiển thị, mô tả ngắn; đơn thành "Đã duyệt (nháp)". Bấm "Soạn tin" ở đơn đó không tạo bản trùng.
6. Trình soạn thảo: "Lưu & Đăng" khi chưa có ảnh đại diện báo lỗi; slug trùng báo lỗi; thêm ảnh đại diện, nhiều ảnh gallery, bài viết (đậm, tiêu đề, ảnh), lưu & đăng.
7. Tin đã đăng xuất hiện ở đầu `/ky-gui`, trang chủ (tối đa 3 tin mới nhất, có nút "Xem tất cả tin ký gửi") và có trang `/ky-gui/<slug>` (breadcrumb, gallery, bảng thông tin, bài viết, hotline/Zalo, form liên hệ). Gửi form "Liên hệ về tin này": xuất hiện ở tab Khách hàng với nguồn Liên hệ và tên tin trong ghi chú.
8. Tab Khách hàng: đơn ký gửi đã duyệt có liên kết "Đã tạo tin" mở trình soạn thảo; yêu cầu liên hệ vẫn đổi trạng thái bằng danh sách chọn như cũ.
9. "Gỡ về nháp": tin biến mất khỏi `/ky-gui`, `/ky-gui/<slug>` hiện "Không tìm thấy tin ký gửi"; gọi `GET /api/index.php?r=data&c=consignments` khi chưa đăng nhập không thấy tin nháp. "Đánh dấu đã giao dịch": tin xếp cuối, có nhãn "Đã giao dịch" ở thẻ và chi tiết, đơn thành "Đã giao dịch"; "Mở bán lại" đưa về Đang đăng.
10. Xóa tin có xác nhận; đơn liên kết quay về Đang xử lý. Mở hồ sơ ẩn danh/mạng khác: không thấy tên, SĐT, ghi chú nội bộ ở bất cứ trang hay phản hồi API công khai nào.
11. Backup (tab Sao lưu): xuất/nhập vẫn hoạt động, tin nháp và đơn nằm trong file.
12. Chạy `bash server/tests/smoke.sh` trên máy có PHP 8.3 (xem `server/README.md`): mọi dòng PASS.
