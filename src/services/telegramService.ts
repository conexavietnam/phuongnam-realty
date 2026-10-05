// Telegram Bot Service for Phuong Nam Realty Admin & Lead Notifications
import { TELEGRAM_BOT_TOKEN } from '../../telegram';

export interface TelegramConfig {
  botToken: string;
  adminChatId: string;
  adminPhone: string;
  botUsername: string;
}

const DEFAULT_CONFIG: TelegramConfig = {
  botToken: TELEGRAM_BOT_TOKEN || '8850370411:AAEObR_WjSc_4OApJk-tHHHe3h0b33ZKWB0',
  adminChatId: '5456744480',
  adminPhone: '0984635286',
  botUsername: 'vaway_bot',
};

const CONFIG_KEY = 'pn_realty_telegram_config';

export const telegramService = {
  // Get active config from storage or fallback to defaults
  getConfig(): TelegramConfig {
    try {
      const saved = localStorage.getItem(CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
        };
      }
    } catch {
      // Fallback to default
    }
    return DEFAULT_CONFIG;
  },

  // Save updated config (e.g., when admin updates phone or Telegram chat ID)
  saveConfig(newConfig: Partial<TelegramConfig>): TelegramConfig {
    const current = this.getConfig();
    const updated = { ...current, ...newConfig };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
    return updated;
  },

  // Low-level send message
  async sendMessage(
    text: string,
    chatIdOverride?: string,
    parseMode: 'HTML' | 'Markdown' = 'HTML',
  ): Promise<{ success: boolean; error?: string }> {
    const config = this.getConfig();
    const targetChatId = chatIdOverride || config.adminChatId;

    if (!config.botToken || !targetChatId) {
      return { success: false, error: 'Thiếu cấu hình bot token hoặc chat ID' };
    }

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${config.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: targetChatId,
            text,
            parse_mode: parseMode,
          }),
        },
      );

      const data = await response.json();
      if (!data.ok) {
        return { success: false, error: data.description || 'Lỗi gửi tin nhắn Telegram' };
      }
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Không thể kết nối tới máy chủ Telegram API',
      };
    }
  },

  // Send OTP with high security formatting
  async sendOTP(
    otp: string,
    actionName: string,
    chatIdOverride?: string,
  ): Promise<{ success: boolean; error?: string }> {
    const text = `🔐 <b>[PHƯƠNG NAM REALTY] MÃ XÁC THỰC OTP</b>

Mục đích: <b>${actionName}</b>
Mã OTP của bạn là: <code>${otp}</code>

⏳ <i>Mã này có hiệu lực trong 5 phút. Vui lòng không tiết lộ cho bất kỳ ai để đảm bảo an toàn thông tin hệ thống.</i>`;

    return this.sendMessage(text, chatIdOverride);
  },

  // Send Consignment Notification
  async notifyNewConsignment(data: {
    fullName: string;
    phone: string;
    email?: string;
    propertyType?: string;
    propertyName?: string;
    address?: string;
    expectedPrice?: string;
    note?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const timeStr = new Date().toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
    });

    const text = `🔔 <b>CÓ YÊU CẦU KÝ GỬI BẤT ĐỘNG SẢN MỚI!</b>

👤 <b>Khách hàng:</b> ${data.fullName || 'Khách vãng lai'}
📞 <b>Số điện thoại:</b> ${data.phone || 'Chưa cung cấp'}
📧 <b>Email:</b> ${data.email || 'Không có'}
🏠 <b>Loại BĐS:</b> ${data.propertyType || 'Căn hộ / Nhà đất'}
📍 <b>Dự án / Địa chỉ:</b> ${data.propertyName || data.address || 'Chưa xác định'}
💰 <b>Mức giá mong muốn:</b> ${data.expectedPrice || 'Thương lượng'}
📝 <b>Ghi chú:</b> ${data.note || 'Không có ghi chú'}
⏰ <b>Thời gian gửi:</b> ${timeStr}`;

    return this.sendMessage(text);
  },

  // Send Customer Contact Consultation Notification
  async notifyNewContact(data: {
    name: string;
    phone: string;
    email?: string;
    subject?: string;
    message?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const timeStr = new Date().toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
    });

    const text = `📩 <b>CÓ YÊU CẦU LIÊN HỆ TƯ VẤN MỚI!</b>

👤 <b>Khách hàng:</b> ${data.name || 'Khách vãng lai'}
📞 <b>Số điện thoại:</b> ${data.phone || 'Chưa cung cấp'}
📧 <b>Email:</b> ${data.email || 'Không có'}
🏷️ <b>Chủ đề:</b> ${data.subject || 'Tư vấn dự án BĐS'}
💬 <b>Nội dung:</b> ${data.message || 'Cần hỗ trợ thông tin'}
⏰ <b>Thời gian gửi:</b> ${timeStr}`;

    return this.sendMessage(text);
  },

  // Test connection to Telegram ID
  async testConnection(chatId: string): Promise<{ success: boolean; error?: string }> {
    const timeStr = new Date().toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
    });
    const text = `✅ <b>KẾT NỐI TELEGRAM BOT THÀNH CÔNG!</b>

Hệ thống quản trị <b>Phương Nam Realty</b> đã liên kết thành công với tài khoản Telegram của bạn.
🆔 Chat ID: <code>${chatId}</code>
⏰ Thời gian: ${timeStr}

Từ bây giờ bạn sẽ nhận được thông báo ký gửi và mã xác thực quản trị tại đây.`;

    return this.sendMessage(text, chatId);
  },
};
