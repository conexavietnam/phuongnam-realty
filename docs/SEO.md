# SEO: để Google, Zalo và Facebook hiểu website

Tài liệu cho người quản trị và người triển khai. Phần kỹ thuật chi tiết (nginx, route) nằm ở `server/README.md`, mục "SEO shell".

## 1. Các phần ghép với nhau thế nào

| Phần | Vai trò |
|-|-|
| Trình soạn thảo (Dự án, BĐS chuyển nhượng, Tin ký gửi, Tin tức) | Mỗi bài có mục **SEO** (tiêu đề, mô tả, từ khóa, ảnh chia sẻ, noindex) và ô **Đường dẫn (slug)** |
| Cài đặt > SEO | Hậu tố tiêu đề, mô tả mặc định, ảnh chia sẻ mặc định, mã xác minh Google/Bing, công tắc cho phép Google lập chỉ mục |
| `server/seo/index.php` | Với mỗi địa chỉ, trả về trang SPA đã có sẵn `<title>`, mô tả, canonical, Open Graph, JSON-LD và nội dung chữ cho robot. Cũng tạo `sitemap.xml`, `robots.txt` và file xác minh Google |
| `src/hooks/useSeo.ts` | Khi người dùng bấm chuyển trang trong website, cập nhật lại tiêu đề, mô tả, canonical cho khớp với bản máy chủ |
| nginx | Chuyển mọi địa chỉ HTML sang `server/seo/index.php` (cấu hình trong `server/README.md`) |

Zalo và Facebook không chạy JavaScript nên chỉ đọc phần `<head>` do máy chủ gửi. Vì vậy bài đăng mới có ảnh và tiêu đề đúng khi dán link vào Zalo/Facebook ngay cả khi không ai mở bằng trình duyệt trước.

Bảng route (một bảng cho mỗi phía, phải giống nhau): `src/seo/routes.ts` (trình duyệt) và `PN_SEO_ROUTES` trong `server/src/seo.php`.

| Địa chỉ | Trang | Ghi chú |
|-|-|-|
| `/` | home | |
| `/du-an`, `/du-an/:slug` | projects, project | |
| `/chuyen-nhuong`, `/chuyen-nhuong/:slug` | properties, property | |
| `/ky-gui`, `/ky-gui/:slug` | consignments, consignment | |
| `/tin-tuc` | news | liệt kê bài và link tới các danh mục |
| `/tin-tuc/danh-muc/:slug` | newsCategory | danh mục tin; chưa có trong danh sách là 404; danh mục không có bài lập chỉ mục là `noindex`; JSON-LD `CollectionPage` + `BreadcrumbList`; tối đa 30 link bài; có trong sitemap khi có bài |
| `/tin-tuc/:slug` | article | slug `danh-muc` bị giữ riêng, bài không được dùng |
| `/lien-he`, `/admin` | contact, admin | |

Đổi đường dẫn (slug) của danh mục: hệ thống ghi nhớ tối đa 10 đường dẫn cũ (`oldSlugs`) và `/tin-tuc/danh-muc/<slug-cu>` trả 301 sang địa chỉ mới (kiểm tra bằng `curl -sI`); đường dẫn cũ không nằm trong sitemap, và đường dẫn đang là của một danh mục khác luôn thắng đường dẫn cũ.

Trang danh mục: tiêu đề là tiêu đề SEO của danh mục, nếu trống là tên danh mục + hậu tố; mô tả là mô tả SEO, nếu trống là mô tả ngắn của danh mục, nếu trống nữa là câu mặc định "Tin tức chuyên mục ...". Menu website không ảnh hưởng SEO shell hay sitemap.

Quy tắc suy ra giá trị mặc định (khi để trống) nằm ở một chỗ cho mỗi phía và phải giống hệt nhau: `src/utils/seo.ts` (trình duyệt) và `server/src/seo.php` (máy chủ). Bộ ví dụ kiểm tra chung: `server/tests/seo-vectors.json`.

| Thông tin | Nếu để trống |
|-|-|
| Tiêu đề | Tiêu đề bài + hậu tố trong Cài đặt > SEO (mặc định ` \| Phương Nam Realty`) |
| Mô tả | Mô tả ngắn (hoặc tóm tắt với tin tức), cắt còn khoảng 155 ký tự; nếu không có thì lấy từ nội dung chi tiết; cuối cùng là mô tả mặc định của website |
| Ảnh chia sẻ | Ảnh đại diện; nếu là SVG hoặc không có thì lấy ảnh đầu bộ sưu tập, rồi ảnh mặc định `/images/og-default.png`. Zalo và Facebook không hiển thị ảnh SVG |
| Từ khóa | Không in thẻ keywords |

Khi nhập tiêu đề SEO riêng, hệ thống dùng đúng chữ bạn nhập (không tự thêm hậu tố), vì vậy hãy tự thêm tên thương hiệu nếu muốn.

## 2. Viết gì vào từng ô SEO

- **Từ khóa chính** (chỉ để chấm điểm, không lưu): cụm người ta sẽ gõ vào Google, ví dụ "căn hộ Thủ Đức". Mục "Kiểm tra nhanh" báo xem cụm này đã có trong tiêu đề chưa.
- **Tiêu đề SEO (meta title)**: 30 đến 60 ký tự. Đặt từ khóa chính ở đầu, thêm điểm khác biệt (vị trí, giá, loại hình). Mỗi trang một tiêu đề riêng. Dài hơn 60 ký tự Google sẽ cắt bớt.
- **Mô tả SEO (meta description)**: 120 đến 160 ký tự, viết như một câu mời bấm: nói rõ trang có gì và vì sao nên xem. Không nhồi từ khóa. Google có thể tự thay bằng đoạn khác nếu thấy hợp hơn.
- **Từ khóa (keywords)**: tối đa 15 từ khóa. Google bỏ qua thẻ này khi xếp hạng, nên điền hay không cũng không ảnh hưởng thứ hạng; điền để ghi chú chủ đề và phục vụ một số công cụ khác. Không có hại.
- **Ảnh chia sẻ (OG image)**: tùy chọn, ảnh JPG/PNG tỉ lệ 1200×630. Để trống sẽ dùng ảnh đại diện.
- **Không cho Google lập chỉ mục (noindex)**: dùng cho trang nội bộ, tin trùng lặp hoặc đang chờ hoàn thiện. Trang vẫn mở được bằng link nhưng không lên Google và không có trong sitemap.
- **Đường dẫn (slug)**: ngắn, không dấu, có từ khóa (ví dụ `can-ho-2pn-palm-river`). Khi đổi đường dẫn của bài đã lưu, hệ thống ghi nhớ đường dẫn cũ (tối đa 10 đường dẫn gần nhất) và link cũ tự chuyển hướng 301 sang link mới, cả trên Google lẫn trong website. Vẫn nên hạn chế đổi vì Google cần thời gian cập nhật. Không đặt trùng đường dẫn đang dùng hoặc đường dẫn cũ của bài khác; nếu một đường dẫn đang là của bài này thì luôn thắng đường dẫn cũ của bài kia.
- Nút **Tự điền từ nội dung** chỉ điền vào các ô còn trống, từ tiêu đề và mô tả ngắn.

## 3. Kết nối Google Search Console

1. Vào https://search.google.com/search-console, thêm tài sản loại **Tiền tố URL** với địa chỉ đúng của website (ví dụ `https://phuongnamrealty.vn`).
2. Chọn xác minh bằng **Thẻ HTML**, copy phần trong `content="..."` (hoặc dán cả thẻ) vào Cài đặt > SEO > "Mã xác minh Google", bấm **Lưu cài đặt SEO**. Hoặc chọn **Tệp HTML**, nhập tên file (dạng `google1234abcd.html`) vào ô "File xác minh HTML" và lưu.
3. Quay lại Search Console, bấm **Xác minh**.
4. Vào **Sơ đồ trang web**, nhập `sitemap.xml`, bấm **Gửi**.
5. Dùng **Kiểm tra URL** cho trang chủ và vài bài mới, bấm **Yêu cầu lập chỉ mục**.

Google thường mất từ vài ngày đến vài tuần để hiển thị. Nếu đã xác minh bằng bản ghi DNS (loại "Tên miền") thì không cần điền mã trong website.

## 4. Tự kiểm tra bằng dòng lệnh

```bash
# 1. Robot thấy gì? (thay <domain> và <slug>)
curl -s -A Googlebot https://<domain>/tin-tuc/<slug> | grep -E '<title>|name="description"|canonical|og:image|application/ld\+json'

# 2. Mã trạng thái: trang thật là 200, không tồn tại phải là 404 (không phải 200)
curl -s -o /dev/null -w '%{http_code}\n' https://<domain>/tin-tuc/<slug>
curl -s -o /dev/null -w '%{http_code}\n' https://<domain>/khong-co-trang-nay

# 3. Tin ký gửi đã chuyển mục phải trả 301 về địa chỉ mới
curl -sI https://<domain>/ky-gui/<slug> | grep -iE '^HTTP|^location'

# 4. Sitemap, robots, caching
curl -s https://<domain>/sitemap.xml | head
curl -s https://<domain>/robots.txt
curl -sI https://<domain>/ | grep -iE 'etag|cache-control'
```

Kiểm tra dữ liệu có cấu trúc: dán địa chỉ bài vào https://search.google.com/test/rich-results (Google chấp nhận Article và các loại tin bất động sản). Kiểm tra chia sẻ: dùng Facebook Sharing Debugger (https://developers.facebook.com/tools/debug/) hoặc dán link vào Zalo để xem thẻ xem trước.

## 5. Hỏi đáp

**Google có dùng thẻ keywords không?** Không. Google đã ngừng dùng thẻ này để xếp hạng từ lâu. Điền vẫn vô hại và để ghi nhớ chủ đề; nên dành thời gian cho tiêu đề, mô tả và nội dung.

**Vì sao đổi tiêu đề mà Google chưa đổi?** Google cập nhật khi thu thập lại trang (vài ngày). Dùng "Kiểm tra URL" > "Yêu cầu lập chỉ mục" để nhanh hơn. Google cũng có thể tự chọn tiêu đề khác nếu thấy tiêu đề bạn viết không khớp nội dung.

**Tắt "Cho phép Google lập chỉ mục website" thì sao?** Mọi trang gắn `<meta name="robots" content="noindex, nofollow">` và header `X-Robots-Tag`, `sitemap.xml` để trống. `robots.txt` cố ý KHÔNG chặn `/` (chỉ chặn `/admin` và `/api/`, bỏ dòng Sitemap), vì Google chỉ thấy lệnh noindex ở những trang nó được phép đọc; chặn bằng robots.txt sẽ khiến trang đã lên Google còn hiện lâu. Chỉ tắt khi website chưa sẵn sàng.

**Trang nháp có lên Google không?** Không. Tin ký gửi ở trạng thái Nháp không có địa chỉ công khai (trả 404) và không nằm trong sitemap.

**Chuyển một tin ký gửi sang mục khác thì link cũ?** Link `/ky-gui/...` tự chuyển hướng 301 sang địa chỉ mục mới, Google sẽ cập nhật theo.

**Đổi đường dẫn rồi mà link cũ vẫn mở?** Đúng như thiết kế: link cũ trả 301 sang link mới (kiểm tra bằng `curl -sI https://<domain>/tin-tuc/<slug-cu>`, thấy `301` và `location`). Sitemap chỉ liệt kê đường dẫn hiện tại.

**Nên đặt `site_url` không?** Có, trong `server/config.php` của máy chủ thật: `'site_url' => 'https://phuongnamrealty.vn'`. Khi đó canonical, og:url, sitemap và link chuyển hướng luôn dùng đúng tên miền chính, không phụ thuộc header Host mà người gửi yêu cầu tự đặt.
