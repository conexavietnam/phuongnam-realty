# Ghi Chép Kỹ Năng & Kinh Nghiệm Xử Lý Lỗi (Skills & Troubleshooting Log)

## 1. Nhật Ký Lỗi Đã Gặp & Cách Khắc Phục
- **Lỗi Resource Exhausted (`generic::resource_exhausted: You exceeded your current quota`) khi gọi `generate_image`**:
  - *Nguyên nhân*: Hạn mức quota API của tài khoản đã chạm ngưỡng tối đa.
  - *Giải pháp theo Skill `image-generation` & `frontend-design`*: Tuyệt đối không dừng lại hoặc để giao diện vỡ hay dùng placeholder cẩu thả; kích hoạt chiến lược Fallback: sử dụng tài nguyên đồ họa chất lượng cao dạng SVG vector/canvas sắc nét không phụ thuộc mạng ngoài, tích hợp cơ chế Zero-Broken-Image qua handler `onError` và gradient mesh sang trọng.

- **Cảnh báo React `set-state-in-effect` trong `MobileImageGallery`**:
  - *Nguyên nhân*: Gọi `setCurrentIndex` đồng bộ trong `useEffect` khi mở modal.
  - *Giải pháp*: Khởi tạo state trực tiếp hoặc xử lý đồng bộ theo trigger mở, tránh cascading renders.

## 2. Quy Tắc Bất Di Bất Dịch Cho Các Lượt Kế Tiếp
1. Mọi thẻ `<img>` phải có thuộc tính `referrerPolicy="no-referrer"` và `loading="lazy"`.
2. Logo và nhãn thương hiệu phải nhất quán trên Desktop, Mobile Header, Mobile Drawer và Footer.
3. Không hardcode chuỗi API key; giữ nguyên các cấu hình bảo mật môi trường.
4. Đối với các hình ảnh BĐS, luôn chuẩn bị các artwork vector SVG phong phú về kiến trúc (toàn cảnh, nội thất, tiện ích hồ bơi/công viên) với kích thước và tỷ lệ tiêu chuẩn (16:9, 4:3, 1:1) để tốc độ tải trang đạt mức tối đa và hiển thị sắc nét trên mọi mật độ màn hình Retina/4K/Mobile.
5. Luôn bổ sung fallback `onError` trên tất cả thẻ `<img>` hiển thị thumbnail để triệt tiêu hoàn toàn rủi ro vỡ hình ảnh (Zero-Broken-Image Policy).
