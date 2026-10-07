// Client wrapper for lead submissions. Telegram notifications are sent by the PHP backend only;
// no bot token or chat id ever reaches the browser.
import { api } from '@/services/apiClient';

// Honeypot field: real users never fill it, bots usually do.
const HONEYPOT_FIELD = 'website';

export const telegramService = {
  submitConsignment(data: {
    fullName: string;
    phone: string;
    purpose: 'ban' | 'cho-thue';
    region?: string;
    propertyType?: string;
    priceRange?: string;
    note?: string;
    honeypot?: string;
  }): Promise<unknown> {
    const { honeypot, ...fields } = data;
    return api.postLead({ ...fields, source: 'consignment', [HONEYPOT_FIELD]: honeypot ?? '' });
  },

  submitContact(data: {
    fullName: string;
    phone: string;
    email?: string;
    subject?: string;
    message?: string;
    region?: string;
    propertyType?: string;
    priceRange?: string;
    honeypot?: string;
  }): Promise<unknown> {
    const { honeypot, ...fields } = data;
    return api.postLead({ ...fields, source: 'contact', [HONEYPOT_FIELD]: honeypot ?? '' });
  },
};
