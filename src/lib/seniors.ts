/** The seniors a delegate can name on a submission (Koç MUN Club, 2026-27). */
export const SENIORS = [
  "Kerem Tüzün",
  "Süleyman Tuğra Çolakoğlu",
  "İpek Özbek",
  "Beren Savar",
  "Lara Erkıralp",
  "Buse Karabatak",
  "Ayda Kılınç",
  "Yıldız Yetkin",
  "Sarp Savaşan",
  "Zeynep Demiralp",
  "Eliz Gündüz",
  "Yağız Yenici",
  "Maya Şahinkaya",
  "Ali Derin Çelikbilek",
  "Deniz Kerem Erişir",
  "Damla Torun",
  "Ela Düzgit",
  "Güney Keskinoğlu",
  "Demir Toker",
] as const;

export const MIN_SENIORS = 1;
export const MAX_SENIORS = 2;

/** Keeps only known seniors, in list order, without duplicates. */
export function normalizeSeniors(values: unknown[]): string[] {
  const chosen = new Set(values.filter((v): v is string => typeof v === "string"));
  return SENIORS.filter((s) => chosen.has(s));
}
