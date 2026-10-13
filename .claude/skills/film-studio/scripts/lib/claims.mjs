// Claims check: every number on screen (prices, percentages, counts, durations) must
// appear in a saved snapshot of the product page. Numbers written as words are not
// checked; the report says so.
import fs from 'node:fs';
import path from 'node:path';
import { plain } from './text.mjs';

const NUM = /(?:(?:AED|USD|INR|EUR|GBP|SAR|Rs\.?|₹|\$|€|£)\s?)?\d+(?:[.,]\d+)*(?:\s?(?:%|\+|×|x(?![a-z])|K(?![a-z])|k(?![a-z])|M(?![a-z])|B(?![a-z])|L(?![a-z])|Cr(?![a-z])))?/g;

// Claims and sources are compared in one canonical form: upper case, thousands separators
// dropped, currency symbols and words unified (₹ = Rs = INR, $ = USD, € = EUR, £ = GBP), no
// space between a currency and its number or a number and its unit sign. Other whitespace
// stays as a single space, so "done. 7 days" can never read as the decimal ".7".
const SYMBOL = { '₹': 'INR', '$': 'USD', '€': 'EUR', '£': 'GBP' };
const CUR_WORD = /(?:^|[^A-Z])(?:AED|USD|INR|EUR|GBP|SAR)$/;
const UNIT_AFTER = /^(?:%|\+|×|X(?![A-Z])|K(?![A-Z])|M(?![A-Z])|B(?![A-Z])|L(?![A-Z])|CR(?![A-Z]))/;

function canon(s) {
  let t = String(s).toUpperCase().replace(/\s+/g, '');
  for (let i = 0; i < 4; i++) t = t.replace(/(\d),(\d{3})(?!\d)/g, '$1$2');
  return t.replace(/^(?:RS\.?)/, 'INR').replace(/^[₹$€£]/, c => SYMBOL[c]);
}

// Canonical source text plus a map from each character back to the original text, for the
// context snippet in the report.
function prepSource(text) {
  let out = '';
  const map = [];
  const push = (s, i) => { for (const ch of s) { out += ch; map.push(i); } };
  const pop = n => { out = out.slice(0, -n); map.length -= n; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (/\s/.test(c)) {
      let j = i;
      while (j < text.length && /\s/.test(text[j])) j++;
      const ahead = text.slice(j, j + 4).toUpperCase();
      const joinCurrency = /\d/.test(ahead[0] || '') && (CUR_WORD.test(out) || /(?:^|[^A-Z])RS\.?$/.test(out));
      const joinUnit = /\d$/.test(out) && UNIT_AFTER.test(ahead);
      if (!joinCurrency && !joinUnit) push(' ', i);
      i = j - 1;
      continue;
    }
    if (c === ',' && /\d/.test(text[i - 1] || '') && /^\d{3}(?!\d)/.test(text.slice(i + 1, i + 5))) continue;
    if (SYMBOL[c]) { push(SYMBOL[c], i); continue; }
    if (/\d/.test(c)) {
      const rs = out.match(/(?:^|[^A-Z])(RS\.?)$/);
      if (rs) { const at = map[map.length - rs[1].length]; pop(rs[1].length); push('INR', at); }
    }
    push(c.toUpperCase(), i);
  }
  return { norm: out, map };
}

// Whole-number match: 7 must not match 70, 1.7, 7.5, 7% or 7x, and 10% must not match 100%.
function findIn(src, claim) {
  const n = src.norm;
  const startsDigit = /^\d/.test(claim), endsDigit = /\d$/.test(claim);
  let from = 0;
  while (true) {
    const i = n.indexOf(claim, from);
    if (i < 0) return -1;
    const b1 = n[i - 1] || '', b2 = n[i - 2] || '';
    const k = i + claim.length, a1 = n[k] || '', a2 = n[k + 1] || '';
    const okBefore = !startsDigit || !(/\d/.test(b1) || (b1 === '.' && /\d/.test(b2)));
    const okAfter = !endsDigit || !(/\d/.test(a1) || (a1 === '.' && /\d/.test(a2)) || a1 === '%' || a1 === '×' || (a1 === 'X' && !/[A-Z]/.test(a2)));
    if (okBefore && okAfter) return i;
    from = i + 1;
  }
}

// The "Source:" / "Fetched:" header that fetch writes is metadata, not page text: dates and
// run numbers in it must not vouch for a claim.
const stripHeader = t => t.replace(/^(?:(?:Source|Fetched|Captured|Note):[^\n]*\n)+\s*/i, '');

export function loadSources(dir, spec) {
  return (spec.sources || []).map(s => {
    const file = s.file ? path.resolve(dir, s.file) : null;
    const text = file && fs.existsSync(file) ? stripHeader(fs.readFileSync(file, 'utf8')) : null;
    return { url: s.url || null, file: s.file || null, text };
  });
}

export function checkClaims(tl, sources, spec = {}) {
  const ignore = new Set((spec.claims && spec.claims.ignore || []).map(canon));
  const usable = sources.filter(s => s.text);
  const prepped = usable.map(s => ({ ...s, ...prepSource(s.text) }));
  const results = [];
  const texts = [];
  for (const e of tl.elements) if (e.verify) for (const t of e.texts) texts.push({ where: e.where, text: plain(t) });
  if (tl.end) for (const t of [tl.end.title, tl.end.tagline, tl.end.sub]) if (t) texts.push({ where: 'end card', text: plain(t) });
  for (const { where, text } of texts) {
    for (const m of text.matchAll(NUM)) {
      const raw = m[0].trim();
      const c = canon(raw);
      if (!/\d/.test(c) || ignore.has(c)) continue;
      let hit = null;
      for (const s of prepped) {
        const i = findIn(s, c);
        if (i >= 0) {
          const o = s.map[i], oe = s.map[Math.min(s.map.length - 1, i + c.length - 1)];
          const ctx = s.text.slice(Math.max(0, o - 60), Math.min(s.text.length, oe + 60)).replace(/\s+/g, ' ').trim();
          hit = { source: s.url || s.file, context: ctx };
          break;
        }
      }
      results.push({ claim: raw, where, found: !!hit, ...(hit || {}) });
    }
  }
  return { results, sources: usable.length, missingSources: sources.filter(s => !s.text).map(s => s.file || s.url) };
}
