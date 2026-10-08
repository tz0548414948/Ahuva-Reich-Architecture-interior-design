/* =============================================================
   build-en.mjs — generates the English page (en/index.html)

   Why: Google indexes one language per address. The Hebrew page
   lives at "/" and the English page at "/en/", linked to each other
   with hreflang so Google shows English searchers the English page.

   Source of truth stays in ONE place:
     - layout/markup  -> index.html (Hebrew)
     - English texts  -> the `translations` and `PAGE_META` objects
                         in script.js
   Never edit en/index.html by hand — re-run:

       node tools/build-en.mjs

   after changing index.html or the English translations.
   No dependencies; plain Node 18+.
============================================================= */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://ahuvareichdesign.com";

let html = readFileSync(join(ROOT, "index.html"), "utf8");
const js = readFileSync(join(ROOT, "script.js"), "utf8");

/* ---------- read the dictionaries out of script.js ---------- */
function extractObject(source, marker) {
    const start = source.indexOf(marker);
    if (start === -1) throw new Error(`Could not find "${marker}" in script.js`);
    const open = source.indexOf("{", start);
    let depth = 0, i = open, quote = null;
    for (; i < source.length; i++) {
        const ch = source[i];
        if (quote) {
            if (ch === "\\") { i++; continue; }
            if (ch === quote) quote = null;
            continue;
        }
        if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
        if (ch === "{") depth++;
        if (ch === "}" && --depth === 0) break;
    }
    return vm.runInNewContext(`(${source.slice(open, i + 1)})`);
}

const T = extractObject(js, "const translations =");
const META = extractObject(js, "const PAGE_META =").en;

const missing = new Set();
const en = key => {
    const v = T[key] && T[key].en;
    if (v == null) missing.add(key);
    return v;
};
const escText = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = s => escText(s).replace(/"/g, "&quot;");

/* ---------- 1. element contents ---------- */
html = html.replace(
    /<(\w+)(\s(?:[^>]*?\s)?data-i18n(-html)?="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g,
    (all, tag, attrs, isHtml, key) => {
        const v = en(key);
        if (v == null) return all;
        return `<${tag}${attrs}>${isHtml ? v : escText(v)}</${tag}>`;
    }
);

/* ---------- 2. translatable attributes (alt, aria-label) ---------- */
html = html.replace(/<[a-zA-Z][^>]*\sdata-i18n-attr="([^"]+)"[^>]*>/g, (tagText, spec) => {
    let out = tagText;
    for (const pair of spec.split(";")) {
        const [attr, key] = pair.split(":").map(s => s.trim());
        const v = en(key);
        if (v == null) continue;
        out = out.replace(new RegExp(`(\\s${attr}=")[^"]*(")`), `$1${escAttr(v)}$2`);
    }
    return out;
});

/* ---------- 3. document language, head metadata ---------- */
const swaps = [
    [/<html lang="he" dir="rtl"/, '<html lang="en" dir="ltr"'],
    [/<body>/, '<body class="lang-en">'],
    [/<title>[^<]*<\/title>/, `<title>${escText(META.title)}</title>`],
    [/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${escAttr(META.description)}$2`],
    [/(<meta property="og:title" content=")[^"]*(")/, `$1${escAttr(META.title)}$2`],
    [/(<meta property="og:site_name" content=")[^"]*(")/, `$1${escAttr(META.title)}$2`],
    [/(<meta property="og:description" content=")[^"]*(")/, `$1${escAttr(META.description)}$2`],
    [/(<meta name="twitter:title" content=")[^"]*(")/, `$1${escAttr(META.title)}$2`],
    [/(<meta name="twitter:description" content=")[^"]*(")/, `$1${escAttr(META.description)}$2`],
    [/(<meta property="og:locale" content=")[^"]*(")/, "$1en_US$2"],
    [/(<meta property="og:url" content=")[^"]*(")/, `$1${SITE}/en/$2`],
    [/(<link rel="canonical" href=")[^"]*(")/, `$1${SITE}/en/$2`],
    [/(<meta name="author" content=")[^"]*(")/, "$1Ahuva Reich$2"],
    [/("name": ")אהובה רייך - אדריכלות ועיצוב פנים(")/, "$1Ahuva Reich - Architecture & Interior Design$2"],
    [/("description": ")[^"]*(",)/, `$1${META.description.replace(/"/g, '\\"')}$2`],
    [/("areaServed": )\[[^\]]*\]/, '$1["Jerusalem", "Central Israel", "Clients abroad"]'],
    [/("url": ")[^"]*(")/, `$1${SITE}/en/$2`],
    [/(<meta\s+name="keywords"\s+content=")[^"]*(")/,
        "$1architect, interior designer, interior design Jerusalem, architect Jerusalem, home design Israel, renovation, Ahuva Reich, interior designer for clients abroad$2"],
];
for (const [re, rep] of swaps) {
    if (!re.test(html)) throw new Error(`Pattern not found in index.html: ${re}`);
    html = html.replace(re, rep);
}

/* ---------- 3b. arrows point forward in a left-to-right page ---------- */
html = html.replace(/>(\s*)←(\s*)</g, ">$1→$2<");

/* ---------- 4. paths: the page lives one folder deeper ---------- */
// language links point back to the Hebrew page
html = html.replace(/(<a\s[^>]*?href=")en\/("[^>]*data-lang-link)/g, "$1../$2");
html = html.replace(/(<a\s+href=")en\/("[\s\S]*?data-lang-link)/g, "$1../$2");
// every other relative asset/link gets a ../ prefix
html = html.replace(/(\s(?:src|href)=")(?!#|https?:|mailto:|tel:|data:|\/|\.\.\/)([^"]+)"/g, '$1../$2"');

html = `<!-- GENERATED FILE — do not edit. Built by tools/build-en.mjs from index.html + script.js. -->\n` + html;

if (missing.size) {
    console.warn("Missing English translations for:", [...missing].join(", "));
}
const leftover = html.replace(/<script[\s\S]*?<\/script>/g, "").match(/[֐-׿][^<"]{0,40}/g) || [];
if (leftover.length) {
    console.warn("Hebrew text still present in en page:", leftover.slice(0, 10));
}

mkdirSync(join(ROOT, "en"), { recursive: true });
writeFileSync(join(ROOT, "en", "index.html"), html);
console.log("Wrote en/index.html");
