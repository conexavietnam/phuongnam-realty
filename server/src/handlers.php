<?php
declare(strict_types=1);

const PN_LEADS_KEPT = 5000;
const PN_LEAD_PURPOSES = ['ban', 'cho-thue', 'tu-van'];
const PN_MEDIA_CATEGORIES = ['project', 'property', 'news', 'banner', 'logo', 'general'];
const PN_IMAGE_TYPES = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'image/gif' => 'gif',
];

function pn_handle_data(): never
{
    pn_require_method(['GET', 'PUT']);
    $name = $_GET['c'] ?? '';
    if (!is_string($name) || pn_collection_kind($name) === null) {
        pn_fail(404, 'Unknown collection');
    }
    if (pn_method() === 'GET') {
        pn_handle_data_read($name);
    }
    pn_handle_data_write($name);
}

function pn_handle_data_read(string $name): never
{
    $public = pn_is_public_collection($name);
    if (!$public) {
        pn_require_admin();
    }
    pn_send_raw(200, pn_read_collection($name), !$public);
}

function pn_handle_data_write(string $name): never
{
    pn_check_origin();
    pn_require_admin();
    pn_require_csrf();
    $body = pn_read_json_body();
    if (!pn_validate_collection($name, $body['data'])) {
        pn_fail(422, 'Invalid data shape for collection ' . $name);
    }
    pn_mutate_collection($name, static fn(string $current): array => [$body['raw'] . "\n", null]);
    pn_send(200, ['ok' => true]);
}

function pn_clean_text(mixed $value, int $maxLength): string
{
    if (!is_string($value)) {
        return '';
    }
    $text = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? '');
    return mb_substr($text, 0, $maxLength);
}

function pn_build_lead(array $in): array
{
    $source = ($in['source'] ?? '') === 'contact' ? 'contact' : 'consignment';
    $name = pn_clean_text($in['fullName'] ?? '', 100);
    $phone = pn_clean_text($in['phone'] ?? '', 20);
    if (mb_strlen($name) < 2) {
        pn_fail(422, 'Họ tên không hợp lệ.');
    }
    if (preg_match('/^0[0-9]{9,10}$/', pn_normalize_phone($phone)) !== 1) {
        pn_fail(422, 'Số điện thoại không hợp lệ.');
    }
    $email = pn_clean_text($in['email'] ?? '', 120);
    if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
        pn_fail(422, 'Email không hợp lệ.');
    }
    $purpose = $source === 'contact' ? 'tu-van' : (string) ($in['purpose'] ?? '');
    if (!in_array($purpose, PN_LEAD_PURPOSES, true)) {
        pn_fail(422, 'Mục đích không hợp lệ.');
    }
    $note = pn_clean_text($in['note'] ?? '', 2000);
    if ($source === 'contact') {
        $subject = pn_clean_text($in['subject'] ?? '', 150);
        $message = pn_clean_text($in['message'] ?? '', 2000);
        $note = '[Chủ đề: ' . ($subject !== '' ? $subject : 'Tư vấn') . '] [Email: ' . ($email !== '' ? $email : 'N/A') . '] - ' . $message;
    }
    return [
        'id' => 'lead-' . time() . '-' . bin2hex(random_bytes(3)),
        'fullName' => $name,
        'phone' => $phone,
        'purpose' => $purpose,
        'region' => pn_clean_text($in['region'] ?? '', 100),
        'propertyType' => pn_clean_text($in['propertyType'] ?? '', 50),
        'priceRange' => pn_clean_text($in['priceRange'] ?? '', 50),
        'note' => $note,
        'createdAt' => gmdate('c'),
        'status' => 'new',
        'source' => $source,
    ];
}

function pn_lead_notification(array $lead): string
{
    $e = static fn(string $v): string => htmlspecialchars($v !== '' ? $v : '-', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $title = $lead['source'] === 'contact' ? '📩 <b>CÓ YÊU CẦU LIÊN HỆ TƯ VẤN MỚI!</b>' : '🔔 <b>CÓ YÊU CẦU KÝ GỬI BẤT ĐỘNG SẢN MỚI!</b>';
    return $title . "\n\n"
        . '👤 <b>Khách hàng:</b> ' . $e($lead['fullName']) . "\n"
        . '📞 <b>Số điện thoại:</b> ' . $e($lead['phone']) . "\n"
        . '🎯 <b>Mục đích:</b> ' . $e($lead['purpose']) . "\n"
        . '📍 <b>Khu vực:</b> ' . $e($lead['region']) . "\n"
        . '🏠 <b>Loại BĐS:</b> ' . $e($lead['propertyType']) . "\n"
        . '💰 <b>Mức giá:</b> ' . $e($lead['priceRange']) . "\n"
        . '📝 <b>Ghi chú:</b> ' . $e($lead['note']) . "\n"
        . '⏰ <b>Thời gian:</b> ' . $e(gmdate('H:i d/m/Y', time() + 7 * 3600) . ' (GMT+7)');
}

function pn_handle_lead(): never
{
    pn_require_method(['POST']);
    pn_check_origin();
    if (!pn_rate_ok('lead', pn_client_ip(), 5, 600)) {
        pn_fail(429, 'Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.');
    }
    $in = pn_read_json_object();
    if (pn_clean_text($in['website'] ?? '', 200) !== '') {
        pn_send(200, ['ok' => true]);
    }
    $lead = pn_build_lead($in);
    pn_append_to_list('customer_leads', $lead, PN_LEADS_KEPT, false);
    if (!pn_telegram_send(pn_lead_notification($lead))) {
        error_log('lead ' . $lead['id'] . ' saved but telegram notification failed');
    }
    pn_send(200, ['ok' => true]);
}

function pn_upload_error_message(int $code): string
{
    return in_array($code, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)
        ? 'Ảnh vượt quá dung lượng cho phép (5MB).'
        : 'Tải ảnh lên thất bại.';
}

function pn_validate_upload(): array
{
    $file = $_FILES['file'] ?? null;
    if (!is_array($file) || !isset($file['error'], $file['tmp_name'], $file['size']) || is_array($file['error'])) {
        pn_fail(400, 'Thiếu file ảnh.');
    }
    if ($file['error'] !== UPLOAD_ERR_OK) {
        pn_fail(400, pn_upload_error_message((int) $file['error']));
    }
    if ((int) $file['size'] > PN_MAX_UPLOAD_BYTES || (int) $file['size'] <= 0) {
        pn_fail(413, 'Ảnh vượt quá dung lượng cho phép (5MB).');
    }
    $tmp = (string) $file['tmp_name'];
    if (!is_uploaded_file($tmp)) {
        pn_fail(400, 'File tải lên không hợp lệ.');
    }
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($tmp);
    if (!is_string($mime) || !isset(PN_IMAGE_TYPES[$mime]) || @getimagesize($tmp) === false) {
        pn_fail(415, 'Chỉ chấp nhận ảnh JPG, PNG, WebP hoặc GIF.');
    }
    return ['tmp' => $tmp, 'ext' => PN_IMAGE_TYPES[$mime], 'size' => (int) $file['size'], 'name' => (string) ($file['name'] ?? '')];
}

function pn_format_size(int $bytes): string
{
    $kb = (int) round($bytes / 1024);
    return $kb > 1024 ? number_format($kb / 1024, 1) . ' MB' : $kb . ' KB';
}

function pn_handle_upload(): never
{
    pn_require_method(['POST']);
    pn_check_origin();
    pn_require_admin();
    pn_require_csrf();
    $upload = pn_validate_upload();
    $category = (string) ($_POST['category'] ?? 'general');
    if (!in_array($category, PN_MEDIA_CATEGORIES, true)) {
        $category = 'general';
    }
    $cfg = pn_config();
    pn_ensure_dir($cfg['uploads_dir'], 0755);
    $filename = bin2hex(random_bytes(16)) . '.' . $upload['ext'];
    $target = $cfg['uploads_dir'] . '/' . $filename;
    if (!move_uploaded_file($upload['tmp'], $target)) {
        throw new RuntimeException('Cannot move uploaded file');
    }
    chmod($target, 0644);
    $item = [
        'id' => 'media-' . time() . '-' . bin2hex(random_bytes(3)),
        'name' => pn_clean_text(pathinfo($upload['name'], PATHINFO_FILENAME), 100) ?: 'image',
        'url' => $cfg['uploads_url'] . $filename,
        'size' => pn_format_size($upload['size']),
        'category' => $category,
        'uploadedAt' => gmdate('c'),
        'isCustomUpload' => true,
    ];
    pn_append_to_list('media', $item, 5000, true);
    pn_send(200, ['ok' => true, 'item' => $item]);
}
