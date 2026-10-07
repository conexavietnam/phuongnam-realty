# Ghi Chép Kỹ Năng & Kinh Nghiệm Xử Lý Lỗi (Skills & Troubleshooting Log)

## 1. Nhật Ký Lỗi Đã Gặp & Cách Khắc Phục

### Lỗi 1: Resource Exhausted khi sinh ảnh qua Gemini API
- **Nguyên nhân**: Quota API giới hạn số lượt gọi đồng thời hoặc hết hạn mức tạm thời.
- **Cách khắc phục**: Thiết kế hình ảnh vector SVG kiến trúc cao cấp trực tiếp cho dự án và banner. Ảnh vector có ưu điểm vô cùng sắc nét trên mọi màn hình Retina/4K, tải siêu nhanh, không phụ thuộc mạng ngoài.

### Lỗi 2: Không đồng bộ dữ liệu giữa Admin CMS và giao diện ngoài web
- **Nguyên nhân**: Các trang web đọc dữ liệu một lần từ file JSON tĩnh lúc render đầu tiên.
- **Cách khắc phục**:
  - Xây dựng `src/services/dataStorage.ts` kết hợp `window.dispatchEvent(new CustomEvent('pn_data_changed'))`.
  - Viết hook phản ứng `useDataListener()` ở `src/hooks/useDataListener.ts`. Khi có bất kỳ thay đổi nào từ Admin, tất cả các trang web lập tức cập nhật dữ liệu mới mà không cần người dùng phải bấm F5 tải lại trang.

### Lỗi 3: Cú pháp tệp token Telegram (`telegram.tsx`)
- **Nguyên nhân**: File `telegram.tsx` do quản trị viên cung cấp chứa chuỗi token trần dạng text, khiến trình phân tích cú pháp TypeScript / Oxlint coi là cú pháp không hợp lệ.
- **Cách khắc phục**: File đã bị xóa; token được chuyển vào `server/config.php` (chỉ trên máy chủ), client không còn giữ token.

### Lỗi 4: Xung đột kiểu dữ liệu TypeScript khi build (`tsc -b`)
- **Nguyên nhân**:
  - `ProjectCategory` quy định nghiêm ngặt là `'cao-cap' | 'shophouse' | 'biet-thu' | 'nha-pho' | 'dat-nen'`.
  - `PropertyType` quy định là `'can-ho' | 'nha-pho' | 'biet-thu' | 'shophouse' | 'dat-nen'`.
  - `NewsArticle` sử dụng trường `excerpt` thay vì `summary`.
  - Timer trong môi trường browser Vite trả về `ReturnType<typeof setTimeout>` thay vì `NodeJS.Timeout`.
- **Cách khắc phục**: Khảo sát trực tiếp các file interface trong `src/types/` (`project.ts`, `property.ts`, `news.ts`, `contact.ts`) và chuẩn hóa 100% các trường dữ liệu tương thích hoàn toàn.

### Lỗi 5: Oxlint `set-state-in-effect` & `exhaustive-deps`
- **Nguyên nhân**:
  - Gọi `setState()` đồng bộ ngay bên trong `useEffect` gây re-render tuần hoàn không cần thiết.
  - Dependency trong `useMemo` không được đọc trực tiếp trong thân hàm.
- **Cách khắc phục**: Khởi tạo state trực tiếp bằng lazy initializer `useState(() => telegramService.getConfig())`, và đọc biến phiên bản `dataVersion` trực tiếp trong khối tính toán của `useMemo`.

---

## 2. Kỹ Năng Tích Hợp Telegram Bot Cho Admin CMS
1. **Bảo mật OTP 2 lớp (Two-Factor Authentication)**:
   - Sử dụng phương thức gửi tin nhắn định dạng HTML bảo mật (`parse_mode: 'HTML'`) với thẻ `<code>` để quản trị viên dễ dàng copy mã trên điện thoại hoặc desktop.
   - Hạn sử dụng mã OTP là 3 - 5 phút và tự động hủy sau khi xác thực.
2. **Quy trình Đổi Số Điện Thoại & Telegram ID an toàn**:
   - Khi có yêu cầu thay đổi tài khoản hoặc ID nhận thông báo, hệ thống bắt buộc gửi mã xác nhận về **Telegram ID CŨ** hiện tại.
   - Chỉ khi nhập đúng OTP từ ID cũ, hệ thống mới cập nhật sang ID mới và đồng thời gửi tin nhắn chào mừng, kích hoạt quyền quản trị đến ID mới.
3. **Đẩy thông báo Lead đa kênh**:
   - Tích hợp cả trên Desktop và Mobile (`ConsignmentForm.tsx` & `ContactForm.tsx`).
   - Định dạng tin nhắn chi tiết: Tên khách hàng, SĐT, Nhu cầu (bán/thuê/tư vấn), Loại BĐS, Vị trí/Dự án, Giá mong muốn, Ghi chú và thời gian theo múi giờ Việt Nam (`Asia/Ho_Chi_Minh`).
