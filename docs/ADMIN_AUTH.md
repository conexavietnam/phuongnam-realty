# Admin: đăng nhập bằng email + mật khẩu

## Cách hoạt động
- **Chế độ khởi tạo (bootstrap)**: chưa có tài khoản (`data/admin_account.json` chưa tồn tại). Đăng nhập bằng Telegram OTP như cũ, sau đó dashboard hiện banner (không tắt được) và thẻ "Tài khoản đăng nhập" ở Cài đặt > Bảo mật để tạo email + mật khẩu.
- **Chế độ mật khẩu**: có tài khoản. Chỉ `auth/login` hoạt động; `auth/otp` và `auth/verify` trả 403 "Không khả dụng".
- Một tài khoản admin duy nhất. 2FA (ứng dụng xác thực) là tùy chọn, bật trong tab Bảo mật; cần `auth_key` trong `server/config.php`.
- Không có "quên mật khẩu" trên web. Khôi phục: SSH vào máy chủ, chạy bằng user của site: `php server/bin/reset-admin.php` (gõ `RESET`). Script sao lưu rồi xóa tài khoản, xóa mọi phiên, gửi cảnh báo Telegram và đưa site về chế độ khởi tạo.
- Telegram vẫn nhận cảnh báo: đăng nhập, khóa tài khoản, đổi mật khẩu/email, bật/tắt 2FA, dùng mã dự phòng, chạy reset.

## Cấu hình một lần
```bash
php -r 'echo base64_encode(random_bytes(32)), PHP_EOL;'   # dán vào auth_key trong server/config.php
```
Không commit khóa này. Mất khóa thì không xác thực được 2FA nữa (dùng reset-admin).

## Kiểm thử tự động
`bash server/tests/smoke.sh` (cần PHP 8.3 có sodium): gồm vector RFC 6238, khóa tài khoản/IP, chính sách mật khẩu, epoch/idle, 2FA, reset-admin.

## Checklist kiểm thử thủ công
1. Site mới (chưa có tài khoản): trang `/admin` hiện khung vàng "Lần đầu: đăng nhập bằng Telegram...". Đăng nhập bằng OTP Telegram được.
2. Dashboard có banner "Chưa thiết lập email và mật khẩu" ở mọi tab, không có nút đóng; "Thiết lập ngay" mở Cài đặt > Bảo mật.
3. Nhập mật khẩu yếu (ngắn, toàn số, lặp ký tự, chứa tên email): danh sách điều kiện không xanh, nút không bấm được; mật khẩu phổ biến (vd `matkhau123456`) bị máy chủ từ chối với lý do tiếng Việt.
4. Tạo tài khoản hợp lệ: banner biến mất, phiên hiện tại vẫn dùng được. Mở tab ẩn danh: `/admin` giờ hiện form email + mật khẩu; gọi `auth/otp` trả 403.
5. Đăng nhập sai mật khẩu và email không tồn tại: thông báo giống hệt "Email hoặc mật khẩu không đúng".
6. Sai 5 lần liên tiếp: hiện "Quá nhiều lần thử" kèm đồng hồ đếm ngược, nút bị khóa; đăng nhập đúng mật khẩu trong lúc khóa vẫn bị từ chối. Telegram nhận cảnh báo khóa.
7. Đăng nhập đúng: vào dashboard; Telegram nhận cảnh báo "Đăng nhập quản trị thành công".
8. Đổi mật khẩu/email (cần mật khẩu hiện tại): thiết bị/trình duyệt khác đang đăng nhập bị văng ra, phiên hiện tại giữ nguyên; Telegram có cảnh báo.
9. Bật 2FA: nhập mật khẩu, quét mã QR bằng Google Authenticator (hoặc nhập khóa thủ công), nhập mã 6 số; nhận 10 mã dự phòng một lần duy nhất (sao chép/tải về); nút "Hoàn tất" chỉ bấm được sau khi tick đã lưu.
10. Đăng xuất rồi đăng nhập: sau mật khẩu hiện bước nhập mã 6 số; mã sai bị từ chối; dùng lại đúng mã vừa dùng thì bị từ chối; "Dùng mã dự phòng" cho đăng nhập được và mã đó không dùng lại được.
11. Tắt 2FA (mật khẩu + mã hoặc mã dự phòng): đăng nhập chỉ còn email + mật khẩu.
12. "Đăng xuất mọi thiết bị": mọi phiên (kể cả phiên này) bị hủy.
13. Để trình duyệt không thao tác hơn 2 giờ: lần gọi kế tiếp bị đưa về trang đăng nhập.
14. Đổi Telegram ID/số điện thoại: yêu cầu thêm mật khẩu hiện tại ở chế độ mật khẩu.
15. Chạy `php server/bin/reset-admin.php` trên máy chủ: site về chế độ khởi tạo, mọi phiên bị hủy, Telegram nhận cảnh báo.
