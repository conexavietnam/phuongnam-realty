# Tài Liệu Phân Tích & Kế Hoạch Triển Khai Hệ Thống Quản Trị Admin CMS & Telegram Bot

## 1. Mục Tiêu & Yêu Cầu Từ Điều Phối
1. **Quản trị toàn bộ dữ liệu ngoài UI**:
   - Cho phép quản trị viên thêm, sửa, xóa, thay thế toàn bộ dữ liệu: Dự án, Bất động sản chuyển nhượng, Tin tức, Ký gửi, Thông tin công ty, Banner... trực tiếp trên giao diện Admin.
   - Bất kỳ thay đổi nào trong Admin phải phản ánh ngay lập tức ra giao diện người dùng ngoài trang web (Desktop & Mobile).
2. **Xác thực Đăng nhập Admin qua Telegram OTP**:
   - Đường dẫn quản trị: `/admin`.
   - Tài khoản đăng nhập: Số điện thoại quản trị `<see server config>`.
   - Xác thực: Hệ thống sinh mã OTP 6 chữ số ngẫu nhiên, máy chủ PHP gửi tin nhắn OTP qua Telegram Bot về Telegram ID `<see server config>` (token và chat id chỉ nằm trong `server/config.php` trên máy chủ, không bao giờ nằm trong mã client).
   - Admin nhập đúng OTP mới được cấp quyền truy cập phiên làm việc.
3. **Đẩy thông báo Ký gửi BĐS & Liên hệ về Telegram**:
   - Khi khách hàng gửi yêu cầu ký gửi bất động sản hoặc form liên hệ ngoài UI, hệ thống tự động gửi thông báo chi tiết (Tên khách, SĐT, loại BĐS, giá, nhu cầu, thời gian) về Telegram ID của Admin theo thời gian thực.
4. **Quy trình Đổi Số Điện Thoại & Đổi Telegram ID (Bảo mật 2 bước)**:
   - Khi Admin muốn đổi số điện thoại quản trị hoặc chuyển sang Telegram ID mới:
     - Cung cấp link bot (`<see server config>`) để người dùng mới chat/lấy ID.
     - Hệ thống bắt buộc gửi mã OTP về **Telegram ID CŨ** (`<see server config>`) để xác minh quyền sở hữu hiện tại.
     - Chỉ khi nhập đúng OTP từ Telegram ID cũ thì hệ thống mới cho phép lưu và kích hoạt Telegram ID / Số điện thoại mới.

---

## 2. Kiến Trúc Kỹ Thuật (Architecture & Security)

### A. Tầng Lưu Trữ & Đồng Bộ Dữ Liệu (Data Engine)
- **Hiện trạng**: Dữ liệu web hiện lưu ở các file JSON tĩnh (`src/data/*.json`). Khi người dùng duyệt web, các service đọc trực tiếp từ các file tĩnh này, không thể thay đổi động ngoài UI.
- **Giải pháp**: Xây dựng **Data Storage Service (`src/services/dataStorage.ts`)**:
  - Tự động nạp (hydrate) dữ liệu gốc từ các file JSON vào kho lưu trữ có trạng thái (Storage State).
  - Tích hợp cơ chế phát sự kiện thay đổi (Event Emitter / Custom Event / State Listener) để khi Admin cập nhật dữ liệu, tất cả các trang web ngoài UI cập nhật lập tức mà không cần F5.
  - Cung cấp tính năng Export JSON (Sao lưu dữ liệu) và Reset về mặc định.
- **Kế hoạch Database cho tương lai**: Hiện tại dữ liệu lưu trữ bền vững tại client/local. Khi kết nối Cloud SQL hoặc Firestore theo yêu cầu sau này, Data Storage Service sẽ đóng vai trò Adapter chuyển tiếp lên API/DB mà không làm thay đổi logic giao diện.

### B. Tầng Tích Hợp Telegram Bot (`src/services/telegramService.ts`)
- **Bot Token**: `<see server config>` (chỉ lưu trong `server/config.php`)
- **Telegram Bot API**: `https://api.telegram.org/bot<TOKEN>/sendMessage`
- **Các hàm cốt lõi**:
  1. `sendOTP(chatId: string, otpCode: string, purpose: string)`: Gửi mã OTP xác thực đăng nhập hoặc đổi cấu hình bảo mật.
  2. `sendConsignmentNotification(chatId: string, data: ConsignmentFormData)`: Gửi thông báo khi khách gửi ký gửi nhà đất.
  3. `sendContactNotification(chatId: string, data: ContactFormData)`: Gửi thông báo khi khách gửi liên hệ tư vấn.
  4. `testConnection(chatId: string)`: Kiểm tra kết nối bot tới Telegram ID.

### C. Tầng Quản Trị Giao Diện Admin (`/admin`)
- **Trang Đăng Nhập (`src/pages/admin/AdminLoginPage.tsx`)**:
  - Giao diện đăng nhập nhập SĐT -> Bấm gửi OTP Telegram -> Đếm ngược 60s -> Nhập OTP xác thực -> Vào Dashboard.
- **Trang Dashboard Quản Trị (`src/pages/admin/AdminDashboardPage.tsx`)**:
  - Giao diện Admin chuyên nghiệp, thiết kế tông màu Navy & Gold đồng bộ Phương Nam Realty.
  - Sidebar chuyển đổi giữa các module quản trị:
    1. **Tổng quan**: Số liệu thống kê BĐS, Dự án, Ký gửi mới, Tin tức.
    2. **Quản lý Dự Án (Projects)**: Bảng danh sách, form Thêm mới / Chỉnh sửa đầy đủ các trường (Tên, Giá từ, Vị trí, Diện tích, Phòng ngủ, Ảnh đại diện, Ảnh chi tiết, Tiện ích, Chủ đầu tư, Trạng thái, Nổi bật), Xóa dự án.
    3. **Quản lý Bất Động Sản (Properties)**: Thêm/Sửa/Xóa nhà đất, căn hộ chuyển nhượng.
    4. **Quản lý Ký Gửi (Consignments)**: Danh sách đơn ký gửi khách gửi từ UI, cập nhật trạng thái xử lý (Chờ duyệt, Đang tư vấn, Đã xong).
    5. **Quản lý Tin Tức (News)**: Thêm/Sửa/Xóa bài viết tin tức thị trường.
    6. **Cài Đặt Hệ Thống (Settings)**:
       - Đổi SĐT Admin và Telegram ID (Quy trình xác minh OTP gửi về Telegram cũ).
       - Cập nhật thông tin công ty (Tên, Hotline, Email, Địa chỉ, Slogan).
       - Sao lưu & Phục hồi dữ liệu.

---

## 3. Kế Hoạch Triển Khai Chi Tiết
1. **Bước 1**: Tạo Service Telegram (`telegramService.ts`) để gửi tin nhắn OTP, thông báo ký gửi, kiểm tra bot.
2. **Bước 2**: Tạo Service Lưu trữ dữ liệu động (`dataStorage.ts`) kết nối và bao bọc các service hiện tại.
3. **Bước 3**: Cập nhật các service hiện tại (`projectService`, `propertyService`, `newsService`, `companyService`) để đọc và ghi qua Data Storage Engine.
4. **Bước 4**: Tạo trang Đăng nhập Admin và Dashboard Admin với đầy đủ tính năng CRUD và Đổi cấu hình bảo mật 2 bước.
5. **Bước 5**: Tích hợp kích hoạt Telegram notification khi người dùng nộp form ký gửi (`ConsignmentForm`, `ContactForm`).
6. **Bước 6**: Đăng ký Route `/admin` trong `App.tsx`.
7. **Bước 7**: Kiểm thử toàn diện Build & Lint, cập nhật tài liệu tiến độ và kỹ năng.
