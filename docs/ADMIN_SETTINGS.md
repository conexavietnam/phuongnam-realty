# Admin: tab Cài đặt (3 tab con)

## Cấu trúc
Mã nguồn nằm trong `src/components/admin/settings/`:
| Tab con | Component | Nội dung |
|---|---|---|
| Thông tin Website | `WebsiteInfoTab.tsx` | Thông tin công ty, banner, logo (`dataStorage.saveCompany`) |
| Form | `FormSettingsTab.tsx` | Danh sách Khu vực, Loại BĐS, Mức giá (`companyService.saveFilterConfig`, collection `filters`) |
| Chân trang | `FooterSettingsTab.tsx` | Các cột liên kết và dòng bản quyền ở chân trang (`menu.footer`, `companyService.saveFooterConfig`) |
| Bảo mật | `SecurityTab.tsx` | Đổi số điện thoại / Telegram ID (`TelegramSettingsCard`) |

`SettingsTabBar.tsx` là thanh tab (`role="tablist"`, phím mũi tên trái/phải). Tab con đang chọn chỉ lưu trong state của `AdminDashboardPage`.

## Dữ liệu `footer`
Nằm trong collection `menu`: `footer: { columns: [{ id, title, links: [{ label, url }] }], copyright }` (tối đa 4 cột, 12 liên kết mỗi cột). Thiếu `footer` (dữ liệu cũ) thì dùng mặc định trong `src/data/menu.json` (giữ giống hệt `server/seed/menu.json`). Địa chỉ hợp lệ: `/đường-dẫn` nội bộ, `https://`, `mailto:`, `tel:`; mọi dạng khác (javascript:, data:, http://, //host) bị từ chối khi lưu và không hiển thị (`src/utils/footerLinks.ts`).

## Dữ liệu `filters`
`{ regions, propertyTypes, priceRanges }`, mỗi phần tử `{ value, label }`. `value` là mã lưu trong đơn ký gửi/liên hệ và dùng để lọc, `label` là chữ hiển thị. Đổi tên chỉ sửa `label`; mục mới tự sinh `value` từ tên (bỏ dấu, gạch nối).
Mức giá có thêm hai cận số `min`/`max` (đơn vị tỷ đồng, bao gồm hai đầu, null = không giới hạn); `propertyService.matchesPriceRange` lọc theo đúng các cận này. Mục cũ chưa có cận được suy ra từ mã cũ (`duoi-3-ty`, `3-5-ty`, `5-10-ty`, `10-20-ty`, `tren-20-ty`) trong `src/utils/priceRange.ts`.

## Checklist kiểm thử thủ công
1. Vào Cài đặt: có 3 tab con, mặc định "Thông tin Website"; phím mũi tên chuyển tab và giữ focus.
2. Thông tin Website: sửa tên/hotline/banner/logo, lưu, header/footer cập nhật như trước.
3. Bảo mật: thẻ đổi số điện thoại / Telegram ID hoạt động như cũ.
4. Form: thấy dòng "Thông báo khách ký gửi được gửi tới Telegram quản trị (thay đổi ở tab Bảo mật)".
5. Thêm một khu vực mới: xuất hiện cuối danh sách và trong phần Xem trước.
6. Thêm mục trùng mã (ví dụ "Quận 2"): báo lỗi, không thêm. Để trống tên một mục rồi Lưu: báo lỗi, không lưu.
7. Đổi thứ tự bằng nút lên/xuống (nút bị khóa ở đầu/cuối), xóa một mục, đổi tên một mục.
8. Lưu: banner xanh thành công. Mở `/ky-gui`, `/lien-he`, `/chuyen-nhuong` (và bản mobile): danh sách mới hiển thị, thứ tự đúng.
9. Lưu khi máy chủ lỗi (hoặc phiên hết hạn): banner đỏ, danh sách quay lại giá trị đã lưu trước đó.
10. Tải lại trang: thay đổi vẫn còn (đã ghi vào máy chủ).
11. Mức giá: sửa ô Từ/Đến của một dòng, lưu; chọn mức giá đó ở bộ lọc /chuyen-nhuong, kết quả theo đúng cận mới. Nhập từ >= đến hoặc để trống cả hai ô: báo lỗi.
12. Thêm mức giá mới chỉ bằng cận (tên để trống): tên được tự đặt (ví dụ "2.5–4 tỷ") và có thể sửa.
13. Chân trang: sửa tên/địa chỉ một liên kết, thêm cột (tối đa 4, nút bị khóa), thêm/xóa/đổi thứ tự liên kết; lưu rồi mở trang bất kỳ: chân trang cập nhật. Liên kết https mở tab mới, nội bộ chuyển trang không tải lại.
14. Nhập `javascript:...`, `data:...`, `http://...` hoặc để trống tên/tiêu đề: báo lỗi, không lưu.
15. "Khôi phục mặc định" đưa form về nội dung gốc nhưng chưa lưu cho đến khi bấm "Lưu chân trang".
16. Danh sách BĐS đọc bộ lọc từ địa chỉ: `/chuyen-nhuong?type=can-ho&region=tp-thu-duc&price=5-10-ty&q=từ-khóa` (giá trị là `value` của mục trong tab Form; giá trị lạ bị bỏ qua). Bấm liên kết loại BĐS ở chân trang: danh sách lọc đúng và ô lọc hiển thị đúng lựa chọn; áp dụng/đặt lại bộ lọc cập nhật địa chỉ.
17. Ảnh bị mất file (404): mọi thẻ img tự đổi sang `/images/placeholder.svg` một lần (logo về `/logo.svg`, banner về `/images/hero-banner.svg`) qua `src/utils/imageFallback.ts`; Kho ảnh hiện nhãn đỏ "Mất file". Service worker chỉ cache ảnh trả về mã 0/200.
