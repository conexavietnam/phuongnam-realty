// Optional per-item SEO data (projects, properties, news, consignment listings). Missing = derived defaults.
export interface ItemSeo {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
  noindex?: boolean;
}

// company.seo: site-wide SEO settings edited in Cài đặt > SEO.
export interface GoogleHtmlFile {
  name: string;
  content: string;
}

export interface CompanySeo {
  titleSuffix: string;
  defaultDescription: string;
  defaultOgImage: string;
  googleSiteVerification: string;
  bingSiteVerification: string;
  googleHtmlFile: GoogleHtmlFile | null;
  indexSite: boolean;
}
