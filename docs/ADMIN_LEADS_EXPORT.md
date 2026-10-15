# Xuất Excel danh sách khách hàng

## Cách dùng
1. Vào **Admin > Khách hàng**, hoặc **Ký gửi > Đơn chờ xử lý**.
2. (Tuỳ chọn) chọn bộ lọc trạng thái.
3. Bấm **Xuất Excel**, chọn:
   - **Theo bộ lọc hiện tại**: chỉ các dòng đang hiển thị (có ghi số dòng).
   - **Tất cả**: toàn bộ danh sách của tab đó (tab Khách hàng: mọi yêu cầu; Đơn chờ xử lý: mọi đơn ký gửi).
4. File `khach-hang-YYYYMMDD-HHmm.xlsx` (giờ GMT+7) được tải về. Mở bằng Excel/LibreOffice, tiếng Việt hiển thị đúng, không cần chọn bảng mã.

Nút bị khóa khi không có dòng nào. File được tạo ngay trên trình duyệt, không gửi dữ liệu đi đâu.

## Các cột
| Cột | Ý nghĩa |
|-|-|
| STT | Số thứ tự trong file |
| Thời gian | Thời điểm khách gửi (dd/mm/yyyy hh:mm, GMT+7), là ô ngày giờ thật |
| Nguồn | Ký gửi / Liên hệ |
| Họ và tên, Số điện thoại | Số điện thoại lưu dạng văn bản, giữ số 0 đầu |
| Email, Chủ đề | Chỉ có với form Liên hệ (tách từ ghi chú `[Chủ đề: ...] [Email: ...] - nội dung`) |
| Nhu cầu | Cần bán / Cho thuê / Tư vấn |
| Khu vực, Loại BĐS, Mức giá | Nhãn theo cấu hình bộ lọc; mã không còn trong cấu hình được giữ nguyên |
| Ghi chú của khách | Nội dung khách nhập (với form Liên hệ: phần nội dung sau tiền tố) |
| Trạng thái | Nhãn trạng thái như trên màn hình |
| Ghi chú nội bộ | Ghi chú của admin |
| Tin ký gửi liên kết | Tiêu đề tin đã tạo từ đơn (hoặc mã tin nếu tin đã bị xóa) |

## An toàn dữ liệu
Mọi ô văn bản là ô chuỗi (không bao giờ là công thức). Giá trị bắt đầu bằng `=`, `+`, `-`, `@` và cột số điện thoại có thêm định dạng Text (`@`), nên Excel không tính toán và vẫn giữ nguyên văn bản khi sửa ô. Ký tự điều khiển không hợp lệ trong XML bị loại bỏ; ô quá 32.000 ký tự bị cắt và thêm "…".

## Kỹ thuật
- Thư viện `write-excel-file` (MIT), tải theo yêu cầu khi bấm Xuất (không làm nặng bundle chính). AutoFilter, cố định dòng tiêu đề được thêm qua hook của thư viện.
- Kiểm tra: `node scripts/check-leads-export.mjs out.xlsx` rồi `python scripts/check-leads-export.py out.xlsx` (cần `pip install openpyxl`).
