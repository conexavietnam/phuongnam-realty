// One phone/Zalo number for the whole public site: company.hotline is the single source of truth.
// The hotline is displayed exactly as the admin typed it; links are built from its digits only.

export interface ContactCompany {
  hotline: string;
  social?: { zalo?: string };
}

export interface ContactAgent {
  phone?: string;
  zaloLink?: string;
}

// Numbers shipped with the demo agents; they must never reach a visitor.
const DEMO_DIGITS = ['0901234567', '0901234568'];

const ZALO_URL = /^https:\/\/(zalo\.me|chat\.zalo\.me)\/[A-Za-z0-9._~\-/?=&%#]+$/;

export function phoneDigits(text: string | undefined | null): string {
  return (text ?? '').replace(/\D/g, '');
}

// Domestic form (leading 0): "+84 931 123 416" and "0084931123416" become "0931123416".
export function localDigits(text: string | undefined | null): string {
  let digits = phoneDigits(text);
  if (digits.startsWith('0084')) digits = digits.slice(4);
  else if (digits.startsWith('84') && digits.length >= 10) digits = digits.slice(2);
  else return digits;
  return `0${digits}`;
}

// Usable = domestic form with its leading 0 and 9-11 digits. A bare 9-digit number ("931123416") is rejected:
// without the 0 or +84 it is ambiguous. Twin of pn_phone_local() in server/src/storage.php (shared vectors).
export function isUsablePhone(text: string | undefined | null): boolean {
  const local = localDigits(text);
  return local.startsWith('0') && local.length >= 9 && local.length <= 11;
}

export function isValidZaloUrl(url: string | undefined | null): boolean {
  return typeof url === 'string' && ZALO_URL.test(url.trim());
}

export function telHref(phone: string | undefined | null): string {
  return isUsablePhone(phone) ? `tel:${localDigits(phone)}` : '#';
}

export function smsHref(phone: string | undefined | null): string {
  return isUsablePhone(phone) ? `sms:${localDigits(phone)}` : '#';
}

function zaloFromPhone(phone: string | undefined | null): string {
  return isUsablePhone(phone) ? `https://zalo.me/${localDigits(phone)}` : '#';
}

export function zaloHref(company: ContactCompany): string {
  const custom = company.social?.zalo?.trim();
  return custom && isValidZaloUrl(custom) ? custom : zaloFromPhone(company.hotline);
}

export interface ResolvedContact {
  phone: string;
  tel: string;
  zalo: string;
  sms: string;
}

export function companyContact(company: ContactCompany): ResolvedContact {
  return { phone: company.hotline, tel: telHref(company.hotline), zalo: zaloHref(company), sms: smsHref(company.hotline) };
}

// An agent's own number is used only when the admin deliberately set a real, non-demo one.
export function agentContact(agent: ContactAgent | undefined | null, company: ContactCompany): ResolvedContact {
  const phone = agent?.phone?.trim() ?? '';
  const own = isUsablePhone(phone) && !DEMO_DIGITS.includes(localDigits(phone));
  if (!own) return companyContact(company);
  const link = agent?.zaloLink?.trim();
  return {
    phone,
    tel: telHref(phone),
    zalo: link && isValidZaloUrl(link) ? link : zaloFromPhone(phone),
    sms: smsHref(phone),
  };
}
