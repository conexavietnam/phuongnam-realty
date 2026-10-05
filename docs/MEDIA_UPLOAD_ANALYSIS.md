# Tài Liệu Phân Tích & Kế Hoạch Triển Khai Hệ Thống Quản Lý Kho Ảnh & Upload Từ Server/VPS

## 1. Yêu Cầu Từ Điều Phối & Quản Trị Viên
1. **Không fix cứng link ảnh**:
   - Thay thế toàn bộ các ô nhập link ảnh text đơn thuần bằng bộ chọn ảnh trực quan (Visual Media Picker & Thumbnail Selector).
2. **Lấy ảnh từ Server/VPS & Tải ảnh trực tiếp lên**:
   - Cho phép người dùng tải ảnh từ máy tính/điện thoại lên hệ thống (lưu trữ tại Kho ảnh Media Library).
   - Cho phép kết nối thư mục tải lên từ VPS/Server hoặc đường dẫn CDN tùy chọn.
3. **Quản trị toàn diện mọi vị trí có ảnh trên toàn bộ hệ thống**:
   - **Dự án (Projects)**: Ảnh đại diện (Thumbnail) và Bộ sưu tập ảnh thực tế (Gallery đa ảnh: thêm/xóa/sắp xếp).
   - **Bất Động Sản (Properties)**: Ảnh đại diện và Bộ sưu tập ảnh nội thất/ngoại thất.
   - **Tin Tức (News)**: Ảnh đại diện bài viết và công cụ chọn ảnh từ VPS để chèn vào nội dung bài viết.
   - **Banner & Giao Diện**: Ảnh nền Hero Banner, Logo thương hiệu, Favicon.
   - **Dự án Ký Gửi**: Ảnh đại diện dự án ký gửi.
4. **Tính năng Kho Ảnh (Media Manager)**:
   - Quản lý danh sách toàn bộ ảnh đã tải lên.
   - Lọc theo danh mục: Dự án, BĐS, Tin tức, Banner, Logo.
   - Tải lên hàng loạt (Multi-file upload) với nén ảnh tự động để tải nhanh và tiết kiệm dung lượng.
   - Xóa ảnh khỏi kho lưu trữ.
   - Xem trước ảnh phóng to (Preview modal).

---

## 2. Kiến Trúc Kỹ Thuật

### A. Tầng Dịch Vụ Kho Ảnh (`src/services/mediaService.ts`)
- Khởi tạo thư viện ảnh mặc định từ các ảnh vector kiến trúc hiện có.
- Lưu trữ danh sách file ảnh tải lên trong kho lưu trữ dữ liệu bền vững (Data Storage & Local Storage / Indexed Storage).
- Cung cấp các phương thức:
  - `getAllMedia()`: Lấy toàn bộ ảnh trong kho.
  - `uploadMedia(file, category)`: Đọc và tối ưu hóa file ảnh, sinh URL/Base64 và thêm vào kho ảnh.
  - `deleteMedia(id)`: Xóa ảnh khỏi kho.
  - `addExternalUrl(url, name, category)`: Thêm ảnh từ VPS/Server bên ngoài vào kho ảnh để tái sử dụng.

### B. Bộ Component Quản Lý & Chọn Ảnh (`src/components/admin/`)
1. **`ImagePickerModal.tsx`**:
   - Modal hiển thị lưới thumbnail toàn bộ ảnh trong kho ảnh Server.
   - Hỗ trợ tab "Kho ảnh có sẵn" và tab "Tải ảnh mới từ thiết bị/VPS".
   - Hỗ trợ chọn 1 ảnh (Single select) hoặc nhiều ảnh (Multi select cho Gallery).
2. **`ImageField.tsx`**:
   - Component hiển thị ảnh đại diện trực quan kèm khung xem trước.
   - Các nút thao tác: "Chọn từ Kho Ảnh VPS", "Tải ảnh lên", "Xóa ảnh".
3. **`GalleryField.tsx`**:
   - Quản lý danh sách nhiều ảnh chi tiết cho Dự án và BĐS.
   - Thêm ảnh mới, xóa từng ảnh, xem trước từng ảnh.
4. **Tab "Kho Ảnh (Media)" trên Admin CMS**:
   - Trang quản lý toàn bộ tài nguyên hình ảnh trên hệ thống.

---

## 3. Các Bước Triển Khai
1. Cập nhật tài liệu phân tích và tiến độ.
2. Xây dựng `src/services/mediaService.ts` quản lý kho ảnh.
3. Xây dựng các component UI: `ImagePickerModal.tsx`, `ImageField.tsx`, `GalleryField.tsx`.
4. Tích hợp bộ chọn ảnh vào:
   - Form Dự án (Thêm & Sửa)
   - Form BĐS (Thêm & Sửa)
   - Form Tin tức (Ảnh đại diện + Nút chèn ảnh vào nội dung)
   - Cài đặt giao diện: Hero Banner, Logo
5. Thêm Tab "Kho Ảnh Server" vào trang Admin Dashboard để quản trị tập trung.
6. Kiểm thử toàn diện build & lint.
