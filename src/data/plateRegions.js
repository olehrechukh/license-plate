// Ukrainian license-plate region codes (2004+ standard).
//
// Each region is assigned SEVERAL two-letter prefixes (as earlier series run
// out). Plates only use the 12 letters shared between the Cyrillic and Latin
// alphabets — А В Е І К М Н О Р С Т Х — which we store in their Latin form
// (A B E I K M H O P C T X). The region is encoded by the first two letters.
//
// Source: avtonomera.net.ua (kody-avtomobilnykh-nomeriv…).
// Slugs must match the `provinces` table.
const REGION_CODES = {
  'crimea':           ['AK', 'KK', 'TK', 'MK'],
  'vinnytska':        ['AB', 'KB', 'MM', 'OK'],
  'volynska':         ['AC', 'KC', 'CM', 'TC'],
  'dnipropetrovska':  ['AE', 'KE', 'PP', 'MI'],
  'donetska':         ['AH', 'KH', 'TH', 'MH'],
  'zhytomyrska':      ['AM', 'KM', 'TM', 'MB'],
  'zakarpatska':      ['AO', 'KO', 'MT', 'MO'],
  'zaporizka':        ['AP', 'KP', 'TP', 'MP'],
  'ivano-frankivska': ['AT', 'KT', 'TO', 'XC'],
  'kyiv-city':        ['AA', 'KA', 'TT', 'TA'],
  'kyivska':          ['AI', 'KI', 'TI', 'ME'],
  'kirovohradska':    ['BA', 'HA', 'XA', 'EA'],
  'luhanska':         ['BB', 'HB', 'EE', 'EB'],
  'lvivska':          ['BC', 'HC', 'CC', 'EC'],
  'mykolaivska':      ['BE', 'HE', 'XE', 'XH'],
  'odeska':           ['BH', 'HH', 'OO', 'EH'],
  'poltavska':        ['BI', 'HI', 'XI', 'EI'],
  'rivnenska':        ['BK', 'HK', 'XK', 'EK'],
  'sevastopol-city':  ['CH', 'IH', 'OH', 'PH'],
  'sumska':           ['BM', 'HM', 'XM', 'EM'],
  'ternopilska':      ['BO', 'HO', 'XO', 'EO'],
  'kharkivska':       ['AX', 'KX', 'XX', 'EX'],
  'khersonska':       ['BT', 'HT', 'XT', 'ET'],
  'khmelnytska':      ['BX', 'HX', 'OX', 'PX'],
  'cherkaska':        ['CA', 'IA', 'OA', 'PA'],
  'chernihivska':     ['CB', 'IB', 'OB', 'PB'],
  'chernivetska':     ['CE', 'IE', 'OE', 'PE']
}

// province slug -> all its two-letter codes.
export const SLUG_TO_CODES = REGION_CODES
export function codesForSlug(slug) {
  return REGION_CODES[slug] || []
}

// Flattened lookup: two-letter code -> province slug.
export const PLATE_CODE_TO_SLUG = Object.fromEntries(
  Object.entries(REGION_CODES).flatMap(([slug, codes]) => codes.map((c) => [c, slug]))
)

// Nationwide / non-regional prefixes (Дія portal, e-cabinet, general issue).
// These don't belong to a region, so region lookup returns null for them.
export const NATIONAL_CODES = new Set(['DI', 'PD', 'ED', 'DC', 'II'])

// First two letters of a normalized plate -> province slug, or null if unknown.
export function provinceForPlateCode(plate) {
  const letters = String(plate || '').toUpperCase().replace(/[^A-Z]/g, '')
  return PLATE_CODE_TO_SLUG[letters.slice(0, 2)] || null
}
