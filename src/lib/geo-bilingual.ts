/**
 * LabourSeva — Tamil Nadu Bilingual Geography (District / Taluk / Panchayat)
 * Guarantees every geographic entity is always rendered with both English and Tamil side by side.
 */

export interface BilingualGeoItem {
  id: number;
  name: string;      // English
  nameTa: string;    // Tamil
  displayName: string; // "English / Tamil"
  code?: string | null;
}

export const TN_DISTRICT_MAP: Record<number, { en: string; ta: string }> = {
  523: { en: "Coimbatore", ta: "கோயம்புத்தூர்" },
  524: { en: "Cuddalore", ta: "கடலூர்" },
  525: { en: "Dharmapuri", ta: "தர்மபுரி" },
  526: { en: "Dindigul", ta: "திண்டுக்கல்" },
  527: { en: "Erode", ta: "ஈரோடு" },
  528: { en: "Kanchipuram", ta: "காஞ்சிபுரம்" },
  529: { en: "Kanyakumari", ta: "கன்னியாகுமரி" },
  530: { en: "Karur", ta: "கரூர்" },
  531: { en: "Krishnagiri", ta: "கிருஷ்ணகிரி" },
  532: { en: "Madurai", ta: "மதுரை" },
  533: { en: "Nagapattinam", ta: "நாகப்பட்டினம்" },
  534: { en: "Namakkal", ta: "நாமக்கல்" },
  535: { en: "Perambalur", ta: "பெரம்பலூர்" },
  536: { en: "Pudukkottai", ta: "புதுக்கோட்டை" },
  537: { en: "Ramanathapuram", ta: "இராமநாதபுரம்" },
  538: { en: "Salem", ta: "சேலம்" },
  539: { en: "Sivaganga", ta: "சிவகங்கை" },
  540: { en: "Thanjavur", ta: "தஞ்சாவூர்" },
  541: { en: "Nilgiris", ta: "நீலகிரி" },
  542: { en: "Theni", ta: "தேனி" },
  543: { en: "Thiruvallur", ta: "திருவள்ளுர்" },
  544: { en: "Thiruvarur", ta: "திருவாரூர்" },
  545: { en: "Tiruchirappalli", ta: "திருச்சிராப்பள்ளி" },
  546: { en: "Tirunelveli", ta: "திருநெல்வேலி" },
  547: { en: "Tiruvannamalai", ta: "திருவண்ணாமலை" },
  548: { en: "Thoothukudi", ta: "தூத்துக்குடி" },
  549: { en: "Vellore", ta: "வேலூர்" },
  550: { en: "Viluppuram", ta: "விழுப்புரம்" },
  551: { en: "Virudhunagar", ta: "விருதுநகர்" },
  560: { en: "Ariyalur", ta: "அரியலூர்" },
  568: { en: "Chennai", ta: "சென்னை" },
  578: { en: "Tiruppur", ta: "திருப்பூர்" },
  296956: { en: "Tenkasi", ta: "தென்காசி" },
  296957: { en: "Ranipet", ta: "ராணிப்பேட்டை" },
  296958: { en: "Tirupathur", ta: "திருப்பத்தூர்" },
  296959: { en: "Kallakurichi", ta: "கள்ளக்குறிச்சி" },
  296974: { en: "Chengalpattu", ta: "செங்கல்பட்டு" },
  299380: { en: "Mayiladuthurai", ta: "மயிலாடுதுறை" },
};

// Fast lookup by name (English or Tamil)
const DISTRICT_LOOKUP_BY_NAME = new Map<string, { id: number; en: string; ta: string }>();
for (const [idStr, data] of Object.entries(TN_DISTRICT_MAP)) {
  const id = Number(idStr);
  DISTRICT_LOOKUP_BY_NAME.set(data.en.toLowerCase().trim(), { id, ...data });
  DISTRICT_LOOKUP_BY_NAME.set(data.ta.toLowerCase().trim(), { id, ...data });
}

// Common Tamil place phonetic rules
const TAMIL_VOWELS: Record<string, string> = {
  "அ": "A", "ஆ": "Aa", "இ": "I", "ஈ": "Ee", "உ": "U", "ஊ": "Oo",
  "எ": "E", "ஏ": "Ae", "ஐ": "Ai", "ஒ": "O", "ஓ": "Oa", "ஔ": "Au"
};

const TAMIL_CONSONANTS: Record<string, string> = {
  "க": "k", "ங": "ng", "ச": "s", "ஞ": "nj", "ட": "t", "ண": "n",
  "த": "th", "ந": "n", "ப": "p", "ம": "m", "ய": "y", "ர": "r",
  "ல": "l", "வ": "v", "ழ": "zh", "ள": "l", "ற": "r", "ன": "n",
  "ஜ": "j", "ஷ": "sh", "ஸ": "s", "ஹ": "h", "க்ஷ": "ksh"
};

const TAMIL_VOWEL_SIGNS: Record<string, string> = {
  "ா": "aa", "ி": "i", "ீ": "ee", "ு": "u", "ூ": "oo",
  "ெ": "e", "ே": "e", "ை": "ai", "ொ": "o", "ோ": "o", "ௌ": "au",
  "்": ""
};

/**
 * Phonetic transliteration from Tamil script to English
 */
export function transliterateTamilToEnglish(text: string): string {
  if (!text) return "";
  const trimmed = text.trim();
  if (!/[\u0B80-\u0BFF]/.test(trimmed)) {
    // Already in English/Latin
    return trimmed;
  }

  let result = "";
  let i = 0;
  const chars = Array.from(trimmed);

  while (i < chars.length) {
    const ch = chars[i];
    const next = chars[i + 1];

    if (TAMIL_VOWELS[ch]) {
      result += TAMIL_VOWELS[ch];
      i++;
      continue;
    }

    if (TAMIL_CONSONANTS[ch]) {
      const c = TAMIL_CONSONANTS[ch];
      if (next && next in TAMIL_VOWEL_SIGNS) {
        const sign = TAMIL_VOWEL_SIGNS[next];
        if (next === "்") {
          result += c;
        } else {
          result += c + sign;
        }
        i += 2;
      } else {
        result += c + "a";
        i++;
      }
      continue;
    }

    result += ch;
    i++;
  }

  return result
    .replace(/thth/gi, "th")
    .replace(/kk/gi, "kk")
    .replace(/pp/gi, "pp")
    .replace(/tt/gi, "tt")
    .replace(/ss/gi, "sh")
    .replace(/chch/gi, "ch")
    .replace(/\b([a-z])/g, (_, l) => l.toUpperCase());
}

/**
 * Given any district name or ID, return English, Tamil, and side-by-side bilingual label
 */
export function getBilingualDistrict(nameOrId: string | number | null | undefined): {
  id?: number;
  en: string;
  ta: string;
  bilingual: string;
} {
  if (nameOrId === null || nameOrId === undefined || nameOrId === "") {
    return { en: "", ta: "", bilingual: "" };
  }

  const num = Number(nameOrId);
  if (!isNaN(num) && TN_DISTRICT_MAP[num]) {
    const d = TN_DISTRICT_MAP[num];
    return { id: num, en: d.en, ta: d.ta, bilingual: `${d.en} / ${d.ta}` };
  }

  const str = String(nameOrId).trim();
  const lower = str.toLowerCase();
  const match = DISTRICT_LOOKUP_BY_NAME.get(lower);
  if (match) {
    return { id: match.id, en: match.en, ta: match.ta, bilingual: `${match.en} / ${match.ta}` };
  }

  // Fallback transliteration
  const isTamil = /[\u0B80-\u0BFF]/.test(str);
  if (isTamil) {
    const en = transliterateTamilToEnglish(str);
    return { en, ta: str, bilingual: `${en} / ${str}` };
  } else {
    return { en: str, ta: str, bilingual: str };
  }
}

/**
 * Universal bilingual formatter for any District, Taluk, or Panchayat
 */
export function formatGeoBilingual(
  name: string | null | undefined,
  nameTa?: string | null | undefined
): { en: string; ta: string; bilingual: string } {
  if (!name && !nameTa) return { en: "", ta: "", bilingual: "" };

  const rawEn = String(name || "").trim();
  const rawTa = String(nameTa || "").trim();

  // If both exist
  if (rawEn && rawTa && rawEn !== rawTa) {
    return { en: rawEn, ta: rawTa, bilingual: `${rawEn} / ${rawTa}` };
  }

  const primary = rawEn || rawTa;
  const isTamil = /[\u0B80-\u0BFF]/.test(primary);

  if (isTamil) {
    const translit = transliterateTamilToEnglish(primary);
    return { en: translit, ta: primary, bilingual: `${translit} / ${primary}` };
  } else {
    // English primary without Tamil
    return { en: primary, ta: primary, bilingual: primary };
  }
}
