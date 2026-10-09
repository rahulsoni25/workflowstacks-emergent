#!/usr/bin/env python3
# Rebuilds the JSON-LD @graph of the Founder Avatar Studio landing page from the page
# itself (title, meta description, h1, FAQ <details>) plus facts read from the media
# files, so the structured data can never disagree with the visible content.
#
#   python3 scripts/founder-avatar-jsonld.py        # run from the repo root; idempotent
#
# Re-run after editing the title, description, h1, prices or FAQ. Prices and plan copy
# live in this file too (the three offer lists) and must be changed in step with the HTML.
import json, re, struct, sys, html as H, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
P = ROOT / 'public/sites/founder-avatar-studio/index.html'
src = P.read_text(encoding='utf-8')
BASE = 'https://workflowstacks.com'; URL = BASE + '/ai-avatar'; MEDIA = BASE + '/sites/founder-avatar-studio/'
def text(s): return re.sub(r'\s+', ' ', H.unescape(re.sub(r'<[^>]+>', '', re.sub(r'<br\s*/?>', ' ', s)))).strip()
title = text(re.search(r'<title>(.*?)</title>', src, re.S).group(1))
desc = H.unescape(re.search(r'<meta name="description" content="(.*?)">', src).group(1))
h1 = text(re.sub(r'<span class="h1-kw">.*?</span>', '', re.search(r'<h1[^>]*>(.*?)</h1>', src, re.S).group(1)))  # the hook only, not the descriptive line
faq = [(text(q), text(a)) for q, a in re.findall(r'<details><summary>(.*?)</summary><p>(.*?)</p></details>', src, re.S)]
assert len(faq) >= 9, len(faq)
# video facts from the mp4 itself
d = (ROOT / 'public/sites/founder-avatar-studio/hero.mp4').read_bytes()
i = d.find(b'mvhd'); v = d[i+4]
ts, du = (struct.unpack('>I', d[i+24:i+28])[0], struct.unpack('>Q', d[i+28:i+36])[0]) if v == 1 else (struct.unpack('>I', d[i+16:i+20])[0], struct.unpack('>I', d[i+20:i+24])[0])
secs = round(du / ts)
vw = vh = 0
for m in re.finditer(b'tkhd', d):  # one per track; the audio track reports 0x0
    j = m.start(); tv = d[j+4]; off = j + 4 + (88 if tv == 1 else 76)
    w, h_ = struct.unpack('>I', d[off:off+4])[0] >> 16, struct.unpack('>I', d[off+4:off+8])[0] >> 16
    if w and h_: vw, vh = w, h_
assert vw and vh, 'no video track dimensions found'
print(f'video: {secs}s {vw}x{vh}; faq: {len(faq)}; title: {title!r}')
ORG, PERSON, SERVICE, PAGE, VIDEO, CRUMB, FAQ, SITE = (URL + '#' + k for k in ('organization', 'rahul-soni', 'service', 'webpage', 'video', 'breadcrumb', 'faq', 'x'))
SITE = BASE + '/#website'
def month_offer(name, price, description):
    return {"@type": "Offer", "name": name, "price": str(price), "priceCurrency": "AED", "description": description, "url": URL + '#pricing',
            "priceSpecification": {"@type": "UnitPriceSpecification", "price": str(price), "priceCurrency": "AED", "unitCode": "MON", "valueAddedTaxIncluded": False},
            "eligibleQuantity": {"@type": "QuantitativeValue", "minValue": 3, "unitCode": "MON"},
            "availability": "https://schema.org/InStock", "seller": {"@id": ORG}}
def media_offer(name, price, description):
    return {"@type": "Offer", "name": name, "price": str(price), "priceCurrency": "AED", "description": description, "url": URL + '#pricing',
            "priceSpecification": {"@type": "UnitPriceSpecification", "price": str(price), "priceCurrency": "AED", "unitCode": "MON", "valueAddedTaxIncluded": False},
            "availability": "https://schema.org/InStock", "seller": {"@id": ORG}}
production = [
    month_offer("Presence", 6000, "8 videos up to 60 seconds a month, scripts written from your ideas, captions and platform cut-downs, one language. AED 750 a video."),
    month_offer("Authority", 11000, "16 videos a month in English and Arabic, thumbnails and platform variants, monthly content plan. AED 688 a video."),
    month_offer("Omnipresence", 18000, "30 videos a month plus ad variations, 48-hour turnaround, monthly FLUO Insights report. AED 600 a video."),
]
media = [
    media_offer("Spark", 3000, "AED 3,000 of media a month plus AED 1,500 management: Instagram Reels and Stories; 85,000–150,000 impressions (planning estimate from published 2026 UAE benchmarks, not a guarantee)."),
    media_offer("Reach", 8000, "AED 8,000 of media a month plus AED 2,500 management: Meta and YouTube; 155,000–275,000 impressions and 20,000–60,000 video views (planning estimate, not a guarantee)."),
    media_offer("Authority", 20000, "AED 20,000 of media a month plus AED 4,500 management: Meta, YouTube and LinkedIn by job title; 310,000–550,000 impressions (planning estimate, not a guarantee)."),
]
bundles = [
    month_offer("Presence+", 11000, "8 videos a month in one language with AED 3,500 of media, Reels and Stories amplification, production, management and media in one price."),
    month_offer("Authority+", 23000, "16 videos a month in English and Arabic with AED 9,500 of media, Meta and YouTube amplification, monthly content plan and reporting."),
    month_offer("Omnipresence+", 46000, "30 videos a month with AED 23,500 of media across Meta, YouTube and LinkedIn, 48-hour turnaround, monthly FLUO Insights report."),
]
graph = [
 {"@type": "Organization", "@id": ORG, "name": "FluoDigital", "url": URL,
  "description": "FluoDigital runs Founder Avatar Studio: AI avatar video production and paid distribution for founders in Dubai and Mumbai, in English and Arabic.",
  "slogan": h1, "telephone": "+971522086253", "email": "rahulsoni25@gmail.com",
  "founder": {"@id": PERSON},
  "contactPoint": [
    {"@type": "ContactPoint", "contactType": "sales", "telephone": "+971522086253", "areaServed": "AE", "availableLanguage": ["English", "Arabic"], "contactOption": "TollFree" if False else None},
    {"@type": "ContactPoint", "contactType": "sales", "telephone": "+919769720732", "areaServed": "IN", "availableLanguage": ["English"]}],
  "location": [
    {"@type": "Place", "name": "Dubai Silicon Oasis", "address": {"@type": "PostalAddress", "addressLocality": "Dubai", "addressCountry": "AE"}},
    {"@type": "Place", "name": "Mumbai", "address": {"@type": "PostalAddress", "addressLocality": "Mumbai", "addressCountry": "IN"}}],
  "areaServed": [{"@type": "City", "name": "Dubai"}, {"@type": "City", "name": "Mumbai"}],
  "knowsLanguage": ["en", "ar"]},
 {"@type": "Person", "@id": PERSON, "name": "Rahul Soni", "jobTitle": "Founder & Director", "worksFor": {"@id": ORG},
  "description": "Founder and Director of FluoDigital. The sample videos on this page are his own AI avatar."},
 {"@type": "WebSite", "@id": SITE, "name": "WorkflowStacks", "url": BASE},
 {"@type": "WebPage", "@id": PAGE, "url": URL, "name": title, "description": desc, "inLanguage": "en",
  "isPartOf": {"@id": SITE}, "about": {"@id": SERVICE}, "mainEntity": {"@id": SERVICE}, "breadcrumb": {"@id": CRUMB}, "video": {"@id": VIDEO},
  "primaryImageOfPage": {"@type": "ImageObject", "url": MEDIA + "cinematic.jpg", "width": 800, "height": 450},
  "datePublished": "2026-09-25", "dateModified": "2026-10-09"},
 {"@type": "BreadcrumbList", "@id": CRUMB, "itemListElement": [
    {"@type": "ListItem", "position": 1, "name": "WorkflowStacks", "item": BASE},
    {"@type": "ListItem", "position": 2, "name": "AI Avatar Studio", "item": URL}]},
 {"@type": "VideoObject", "@id": VIDEO, "name": "A founder's AI avatar talking head, made without a camera",
  "description": f"A {secs}-second loop of Rahul Soni's AI avatar speaking to camera. This is the vertical talking-head format Founder Avatar Studio posts weekly on LinkedIn and Instagram; no camera was involved in making it.",
  "thumbnailUrl": [MEDIA + "talking-head.jpg"], "contentUrl": MEDIA + "hero.mp4", "encodingFormat": "video/mp4",
  "uploadDate": "2026-09-25", "duration": f"PT{secs}S", "width": vw, "height": vh, "publisher": {"@id": ORG}},
 {"@type": "Service", "@id": SERVICE, "name": "Founder Avatar Studio", "alternateName": "AI Avatar Studio",
  "serviceType": "AI avatar video production and distribution", "category": "AI avatar videos for founders",
  "description": "We build a digital twin of you in seven days, then write, produce and publish your videos in English and Arabic — and put paid media behind the ones that work. One 45-minute capture session is all you ever sit through.",
  "url": URL, "image": MEDIA + "cinematic.jpg", "provider": {"@id": ORG}, "brand": {"@id": ORG},
  "areaServed": [{"@type": "City", "name": "Dubai"}, {"@type": "City", "name": "Mumbai"}],
  "availableLanguage": ["English", "Arabic"],
  "audience": {"@type": "Audience", "audienceType": "Founders in Dubai and Mumbai"},
  "offers": production,
  "hasOfferCatalog": {"@type": "OfferCatalog", "name": "Founder Avatar Studio pricing", "itemListElement": [
     {"@type": "OfferCatalog", "name": "Production (per month, excluding VAT, minimum three months)", "itemListElement": production},
     {"@type": "OfferCatalog", "name": "Media budget (paid from your own ad account, plus management)", "itemListElement": media},
     {"@type": "OfferCatalog", "name": "Both together (one invoice)", "itemListElement": bundles}]}},
 {"@type": "FAQPage", "@id": FAQ, "url": URL + '#faq', "mainEntity": [
    {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]},
]
def clean(o):
    if isinstance(o, dict): return {k: clean(v) for k, v in o.items() if v is not None}
    if isinstance(o, list): return [clean(v) for v in o]
    return o
data = clean({"@context": "https://schema.org", "@graph": graph})
out = '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '</script>'
new, n = re.subn(r'<script type="application/ld\+json">.*?</script>', lambda m: out, src, count=1, flags=re.S)
assert n == 1
P.write_text(new, encoding='utf-8')
json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', new, re.S).group(1))  # round-trip check
print('json-ld bytes:', len(out), '| types:', [g['@type'] for g in graph])
