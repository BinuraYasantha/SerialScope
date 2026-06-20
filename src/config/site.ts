export const SITE_NAME = 'SerialScope'
export const SITE_URL = 'https://serialscope.pages.dev'
export const SITE_DESCRIPTION =
  'SerialScope is a browser-based serial monitor for USB devices with live serial output, saved command presets, XML import, and Web Serial support.'
export const SITE_OG_IMAGE_PATH = '/og-image.svg'

export function absoluteSiteUrl(path = '/') {
  return new URL(path, SITE_URL).toString()
}

export function buildSoftwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    url: absoluteSiteUrl('/'),
    description: SITE_DESCRIPTION,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  }
}
