# Admin: tab Cài đặt (3 tab con)

## Cấu trúc
Mã nguồn nằm trong `src/components/admin/settings/`:
| Tab con | Component | Nội dung |
|---|---|---|
| Thông tin Website | `WebsiteInfoTab.tsx` | Thông tin công ty, banner, logo (`dataStorage.saveCompany`) |
| Form | `FormSettingsTab.tsx` | Danh sách Khu vực, Loại BĐS, Mức giá (`companyService.saveFilterConfig`, collection `filters`) |
| Bảo mật | `SecurityTab.tsx` | Đổi số điện thoại / Telegram ID (`TelegramSettingsCard`) |

`SettingsTabBar.tsx` là thanh tab (`role="tablist"`, phím mũi tên trái/phải). Tab con đang chọn chỉ lưu trong state của `AdminDashboardPage`.

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
