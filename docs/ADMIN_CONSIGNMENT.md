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

## Chọn mục đăng (`section`)

Khi bấm "Duyệt & tạo tin nháp", admin chọn **Đăng vào mục**: `ky-gui` (mặc định, tin ký gửi của khách), `chuyen-nhuong` (BĐS chuyển nhượng, tin mua bán/cho thuê) hoặc `du-an` (dự án của chủ đầu tư). Tin vẫn nằm trong collection `consignments` (một nguồn dữ liệu duy nhất, nháp vẫn được máy chủ bảo vệ); chỉ trường `section` quyết định nơi hiển thị. Thiếu `section` (dữ liệu cũ) = `ky-gui`. Có thể đổi mục bất cứ lúc nào trong trình soạn thảo (ô "Đăng vào mục" ở đầu form), kể cả sau khi đã đăng; link cũ `/ky-gui/<slug>` tự chuyển hướng sang mục mới.

| section | Hiển thị ở | Trang chi tiết | Trường riêng trong trình soạn thảo |
|---|---|---|---|
| `ky-gui` | `/ky-gui` (thẻ nhãn Ký gửi) | `/ky-gui/<slug>` | phòng ngủ, phòng tắm, hướng, pháp lý |
| `chuyen-nhuong` | `/chuyen-nhuong` cùng các BĐS gốc (nhãn Chuyển nhượng) | `/chuyen-nhuong/<slug>` | như trên + `floor` (tầng), `view` (tầm nhìn) |
| `du-an` | `/du-an` cùng các dự án gốc (nhãn Dự án) | `/du-an/<slug>` | `investor`, `projectStatus`, `priceFrom`, `categoryLabel`, `highlights` (tối đa 20 dòng) |

- Chuyển đổi chỉ khi đọc: `src/utils/consignmentAdapters.ts` (`consignmentToProperty`, `consignmentToProject`, `mergedProperties`, `mergedProjects`) và `propertyService`/`projectService` (danh sách, bộ lọc URL, `getBySlug`). Tin mới đăng xếp trước các mục gốc, tin "Đã giao dịch" xếp cuối và có nhãn. Khi trùng slug thì mục gốc thắng.
- Slug phải duy nhất giữa BĐS chuyển nhượng, dự án và tin ký gửi: trình soạn thảo báo "Đường dẫn ... đã được dùng bởi một mục khác (...)".
- Thiếu trường (ví dụ chưa có diện tích, chủ đầu tư) thì dòng đó bị ẩn trên trang chi tiết.
- Tab Dự án và BĐS chuyển nhượng hiện banner "N tin từ Ký gửi đang hiển thị ở mục này" kèm nút mở tab Ký gửi đã lọc theo mục; số liệu tổng quan chỉ đếm mục gốc nên không đếm trùng. Bảng "Tin ký gửi" có nhãn mục và bộ lọc mục; thẻ đơn hiển thị mục đã chọn.
- Máy chủ chấp nhận `section` thuộc ba giá trị trên, `investor`, `projectStatus`, `priceFrom`, `floor`, `view`, `categoryLabel` là chuỗi có giới hạn độ dài, `highlights` là danh sách tối đa 20 chuỗi ngắn; bộ lọc công khai (ẩn nháp, ẩn khóa riêng tư) không đổi.

## Quyền riêng tư
Họ tên và số điện thoại chủ nhà chỉ nằm trong `customer_leads`. Tin ký gửi không bao giờ sao chép chúng. Máy chủ còn lọc lớp thứ hai: người chưa đăng nhập gọi `data&c=consignments` chỉ nhận tin `published`/`sold` và đã bị bỏ mọi khóa bắt đầu bằng `_` hoặc tên `internalNote`, `leadId`, `ownerName`, `ownerPhone`. Dữ liệu riêng tư chỉ được đặt trong các khóa riêng tư kể trên ở cấp ngoài cùng của tin; tuyệt đối không đặt trong đối tượng lồng nhau, gallery hay `fullDescription` (máy chủ chỉ lọc khóa cấp ngoài cùng). Trang công khai chỉ hiển thị hotline/Zalo của công ty và form "Liên hệ về tin này" (tạo lead nguồn `contact`).

## Mã nguồn
- `src/components/admin/consignment/`: `ConsignmentTab` (hai tab con), `ApplicationsPanel` (đơn), `ListingsPanel` (tin), `ListingEditorModal`, `LeadStatusControl` (tab Khách hàng).
- `src/services/consignmentService.ts`: lọc công khai, duyệt đơn, lưu tin, đồng bộ trạng thái đơn.
- `src/utils/consignment.ts`: chuẩn hóa dữ liệu cũ, nhãn trạng thái. `server/src/storage.php`: lọc công khai + kiểm tra khi ghi.
- Duyệt đơn tạo tin nháp có id cố định `consign-<id đơn>` nên bấm lại không tạo trùng. Tin tạo từ đơn bị chặn đăng (nút Đăng, Lưu & Đăng, và cả máy chủ không cần thiết vì chặn ở `consignmentService.save`) khi mô tả ngắn còn trống hoặc vẫn y hệt ghi chú của khách. Bản nháp lấy khu vực, loại BĐS, khoảng giá (vào "Giá hiển thị", không vào giá số) và ghi chú của khách (vào mô tả ngắn: hãy đọc lại trước khi đăng).

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
12. Tin tạo từ đơn: trình soạn thảo hiện nhắc "Tên và số điện thoại chủ nhà không bao giờ được đăng công khai" và cảnh báo vàng "Ghi chú của khách đang là mô tả ngắn — hãy viết lại trước khi đăng"; nút "Lưu & Đăng" bị khóa, nút Đăng (mũi tên gửi) ở danh sách tin bị khóa; sửa mô tả ngắn khác ghi chú của khách thì cảnh báo mất và đăng được.
13. Giả lập lỗi mạng ở lần ghi thứ hai khi "Duyệt & tạo tin nháp": đơn hiện thông báo lỗi và nút "Thử lại"; bấm lại tạo đúng một tin nháp (không trùng) và đơn chuyển "Đã duyệt (nháp)".
14. Trang chi tiết BĐS chuyển nhượng trên mobile (`/chuyen-nhuong/<slug>`) mở được; cột "Nhu cầu" trong tab Khách hàng, tổng quan và tab Ký gửi hiển thị "Cần bán", "Cho thuê" hoặc "Tư vấn".
15. Chọn mục: "Duyệt & tạo tin nháp" mở hộp thoại "Đăng vào mục" có 3 lựa chọn giải thích rõ, mặc định Ký gửi. Chọn BĐS chuyển nhượng: trình soạn thảo mở với mục đó và có ô Tầng/Tầm nhìn; sửa, viết lại mô tả ngắn, thêm ảnh, "Lưu & Đăng": tin xuất hiện đầu `/chuyen-nhuong` (nhãn Chuyển nhượng, lọc theo `?type=`/`?price=` hoạt động) và có `/chuyen-nhuong/<slug>`, KHÔNG có trong `/ky-gui`.
16. Tương tự với Dự án: ô Chủ đầu tư, Tình trạng, Giá từ, Nhóm loại hình, Điểm nhấn; tin hiện ở `/du-an` và `/du-an/<slug>` (dòng thiếu dữ liệu bị ẩn).
17. Đổi mục lại thành Ký gửi trong trình soạn thảo, lưu: tin về `/ky-gui`, `/chuyen-nhuong/<slug>` báo không tìm thấy; mở `/ky-gui/<slug>` của tin đang ở mục khác tự chuyển sang địa chỉ đúng. Gỡ về nháp: biến mất ở mọi nơi. Đánh dấu đã giao dịch: xếp cuối mục, có nhãn "Đã giao dịch".
18. Đặt slug trùng một dự án/BĐS gốc (ví dụ `palm-river`): báo lỗi trùng đường dẫn, không lưu. Trang chủ không hiện một tin hai lần. Banner ở tab Dự án/BĐS chuyển nhượng đếm đúng và nút mở tab Ký gửi đã lọc mục.
19. Tin ở mục BĐS chuyển nhượng không có chuyên viên riêng (`agentId` trống hoặc không tồn tại): trang chi tiết (desktop và mobile) hiện thẻ liên hệ công ty (hotline, Zalo, email) thay vì chuyên viên đầu tiên; BĐS gốc vẫn hiện đúng chuyên viên của mình.
20. Mã loại hình (`biet-thu`, `can-ho`, `cao-cap`...) luôn hiển thị bằng nhãn trong bộ lọc (Biệt thự, Căn hộ...) ở thẻ, trang chi tiết mobile/desktop và bảng admin; mã lạ hiện dạng đọc được (bỏ gạch nối, viết hoa chữ đầu).
21. Slug duy nhất ở cả hai trình soạn thảo gốc: tạo BĐS hoặc Dự án mới có tiêu đề sinh ra slug trùng một tin ký gửi, BĐS hoặc dự án khác (ví dụ tiêu đề "Biệt thự Q7" khi đã có tin `biet-thu-q7`): báo "Đường dẫn ... đã được dùng bởi một mục khác (...)" và không lưu; sửa một mục gốc giữ nguyên slug thì lưu bình thường. Hai trình soạn thảo gốc không có ô slug: slug giữ nguyên khi sửa và sinh từ tiêu đề khi tạo mới.
22. Chạy `bash server/tests/smoke.sh` trên máy có PHP 8.3 (xem `server/README.md`): mọi dòng PASS.
