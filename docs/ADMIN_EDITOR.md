# Admin: tải nhiều ảnh & trình soạn thảo bài viết

## Phạm vi
- `mediaService.uploadFiles(files, category, onProgress)`: kiểm tra trước (JPG/PNG/WebP/GIF, tối đa 5MB), tải tối đa 3 ảnh song song, một ảnh lỗi không làm dừng các ảnh còn lại. Trả về `{ uploaded, failed }`.
- Trình soạn thảo TipTap: `src/components/admin/RichTextEditor.tsx` (nạp lười qua `LazyRichTextEditor`, nằm trong chunk riêng của admin).
- Dữ liệu cũ (văn bản thuần, `![mô tả](đường-dẫn)`) được chuyển sang HTML khi mở và khi hiển thị (`src/utils/richText.ts`). Nội dung lưu và hiển thị đều qua DOMPurify allow-list.

## Trường dùng trình soạn thảo
| Trường | Trình soạn thảo |
|---|---|
| Tin tức: `content` | Rich text |
| Dự án: `fullDescription` | Rich text |
| BĐS: `fullDescription` ("Mô tả chi tiết", mới thêm vào form) | Rich text |
| Tóm tắt (excerpt), mô tả ngắn, địa chỉ, ghi chú | Giữ textarea thuần |

## Checklist kiểm thử thủ công
1. Kho ảnh: chọn 5+ ảnh một lần, thấy "Đang tải x/N" và thông báo kết quả; kéo thả nhiều ảnh vào khung lưới cũng hoạt động.
2. Chọn 1 file .bmp hoặc ảnh > 5MB cùng các ảnh hợp lệ: ảnh hợp lệ vẫn lên, ảnh lỗi nằm trong danh sách kèm lý do.
3. Bộ sưu tập (dự án/BĐS): "Tải nhiều ảnh từ máy" thêm tất cả ảnh theo đúng thứ tự chọn; kéo thả vào lưới cũng được.
4. Ô ảnh đại diện (ImageField): chọn nhiều file thì chỉ dùng ảnh đầu và có thông báo.
5. Hộp chọn ảnh, tab Kho ảnh: ở chế độ nhiều (Bộ sưu tập, nút chèn ảnh trong editor) tick nhiều ảnh, nút "Chọn N ảnh"; ở ImageField vẫn chọn 1 ảnh.
6. Editor: Đoạn/H2/H3, đậm, nghiêng, gạch chân, danh sách, trích dẫn, căn lề, undo/redo, xóa định dạng; thanh công cụ dính khi cuộn.
7. Liên kết: nhập `javascript:...` bị từ chối; `https://`, `mailto:`, `tel:` được nhận; bài đã lưu mở link ở tab mới.
8. Chèn ảnh bằng nút (chọn nhiều ảnh), dán ảnh từ clipboard, kéo thả file ảnh vào editor.
9. Mở bài cũ (văn bản thuần) thấy đoạn văn đúng; lưu rồi mở lại không mất nội dung; ảnh `![...](...)` cũ hiện thành ảnh.
10. Lưu bài, mở trang public (desktop và mobile): tiêu đề, danh sách, trích dẫn, ảnh hiển thị đúng; thẻ tin tức chỉ hiện văn bản thuần.
11. Bấm bất kỳ nút trên thanh công cụ không làm submit form (modal không đóng, không lưu).
12. Điện thoại: thanh công cụ xuống dòng gọn, soạn thảo được.
