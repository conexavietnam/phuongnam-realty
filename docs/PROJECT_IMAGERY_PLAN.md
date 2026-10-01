# Kế Hoạch Bổ Sung Hình Ảnh, Banner & Logo Cho Phương Nam Realty

## 1. Yêu Cầu Từ Khách Hàng / Điều Phối
- Bổ sung ảnh dự án cao cấp, sắc nét, đẹp lung linh cho toàn bộ danh sách dự án.
- Thiết kế và tích hợp Logo nhận diện thương hiệu sang trọng (Phương Nam Realty) phong cách hoàng gia/vàng kim (Gold & Deep Navy).
- Thiết kế Hero Banner đẳng cấp bất động sản thượng lưu (Luxury Waterfront Architecture, Skyline Hoàng Hôn & Ánh Đèn Đêm).

## 2. Giải Pháp Triển Khai
1. **Logo Thương Hiệu**:
   - Thiết kế vector component `Logo.tsx` với biểu tượng tòa tháp kiến trúc kết hợp ký tự cách điệu "PN", chuyển sắc vàng gold kim loại (`linear-gradient` từ `#FFE599` sang `#D49B42` và `#9B6F1E`).
   - Cập nhật favicon `/public/favicon.svg` đồng bộ nhận diện.
   - Thay thế các khối text/icon thô sơ trong `Header`, `MobileHeader`, `Footer`, `MobileDrawer`.
2. **Hero Banner Thượng Lưu**:
   - Xây dựng banner đồ họa kiến trúc vector chất lượng cao (1920x800) với phong cảnh ven sông Sài Gòn & Tháp Landmark lung linh về đêm, ánh đèn vàng ấm áp và phản chiếu mặt nước.
   - Bổ sung số liệu uy tín (Proof points: 10+ năm kinh nghiệm, 500+ dự án phân phối, 99% khách hàng hài lòng).
3. **Hình Ảnh Dự Án (Projects & Properties)**:
   - Tạo bộ ảnh kiến trúc chi tiết từng phân khúc (Căn hộ ven sông Palm River, Đô thị sinh thái Sensa Park, Tòa tháp công nghệ Genera, Phố thương mại The Global City, Biệt thự sinh thái Vinhomes Riverside).
   - Tối ưu hóa hiển thị trong `ProjectCard`, `MobileProjectCard`, `PropertyCard`, `ImageGallery` với chính sách Zero-Broken-Image (luôn có fallback gradient & icon sang trọng khi mạng chập chờn).
