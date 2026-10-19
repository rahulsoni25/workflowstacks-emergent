#!/usr/bin/env python3
# Rebuilds the JSON-LD @graph of the AI Invisibility Report landing page from the page
# itself (title, meta description, h1, FAQ <details>), so the structured data can never
# disagree with the visible content.
#
#   python3 scripts/ai-visibility-jsonld.py        # run from the repo root; idempotent
#
# Re-run after editing the title, description, h1, prices or FAQ. Prices and plan copy
# live in this file too (the offer lists) and must be changed in step with the HTML.
import json, re, html as H, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
P = ROOT / 'public/sites/ai-visibility-audit/index.html'
src = P.read_text(encoding='utf-8')
BASE = 'https://workflowstacks.com'; URL = BASE + '/ai-visibility'; MEDIA = BASE + '/sites/ai-visibility-audit/'
PUBLISHED = MODIFIED = '2026-10-19'
def text(s): return re.sub(r'\s+', ' ', H.unescape(re.sub(r'<[^>]+>', '', re.sub(r'<br\s*/?>', ' ', s)))).strip()
title = text(re.search(r'<title>(.*?)</title>', src, re.S).group(1))
desc = H.unescape(re.search(r'<meta name="description" content="(.*?)">', src).group(1))
h1 = text(re.sub(r'<span class="h1-kw">.*?</span>', '', re.search(r'<h1[^>]*>(.*?)</h1>', src, re.S).group(1)))  # the hook only
faq = [(text(q), text(a)) for q, a in re.findall(r'<details><summary>(.*?)</summary><p>(.*?)</p></details>', src, re.S)]
assert len(faq) >= 10, len(faq)
# Every price below must also be on the page, so the markup cannot advertise one the page doesn't.
for shown in ('AED 1,995', 'USD 545', 'AED 4,995', 'AED 12,500', 'AED 6,500–12,000', 'AED 1,500'):
    assert shown in src, shown
print(f'faq: {len(faq)}; title: {title!r}; h1: {h1!r}')
ORG, PERSON, SERVICE, PAGE, CRUMB, FAQ, APP = (URL + '#' + k for k in ('organization', 'rahul-soni', 'service', 'webpage', 'breadcrumb', 'faq', 'scan'))
SITE = BASE + '/#website'
AREA = [{"@type": "City", "name": "Dubai"}, {"@type": "Country", "name": "United Arab Emirates"}]

def one_time(name, price, description, currency='AED'):
    return {"@type": "Offer", "name": name, "price": str(price), "priceCurrency": currency, "description": description, "url": URL + '#pricing',
            "priceSpecification": {"@type": "PriceSpecification", "price": str(price), "priceCurrency": currency, "valueAddedTaxIncluded": False},
            "availability": "https://schema.org/InStock", "seller": {"@id": ORG}}
def monthly(name, description, min_price, max_price=None):
    spec = {"@type": "UnitPriceSpecification", "priceCurrency": "AED", "unitCode": "MON", "valueAddedTaxIncluded": False, "minPrice": str(min_price)}
    if max_price: spec["maxPrice"] = str(max_price)
    return {"@type": "Offer", "name": name, "price": str(min_price), "priceCurrency": "AED", "description": description, "url": URL + '#pricing',
            "priceSpecification": spec, "availability": "https://schema.org/InStock", "seller": {"@id": ORG}}

REPORT_DESC = ("25 buyer prompts run in ChatGPT, Gemini, Perplexity and Google AI Overviews; a score of how many prompts name you; "
               "a competitor battleboard; a citation-source map; the top 20 missed prompts; technical and entity issues; "
               "a prioritised 90-day fix plan; and a 30-minute walkthrough call. Delivered in five business days.")
report = [one_time("AI Invisibility Report", 1995, REPORT_DESC), one_time("AI Invisibility Report", 545, REPORT_DESC, 'USD')]
after = [
    one_time("30-Day Visibility Fix", 4995, "After the report: we fix the top 5 gaps the report finds, within 30 days."),
    one_time("90-Day AI Visibility Sprint", 12500, "Full implementation of the 90-day plan from the report."),
    monthly("Monthly AI Visibility Retainer", "Ongoing tracking and improvement of AI visibility. AED 6,500–12,000 a month.", 6500, 12000),
    monthly("Agency white-label", "Resell the audit under your own name: your logo on reports, enquiries from your own scan link tagged as yours, wholesale pricing or revenue share. From AED 1,500 per client a month.", 1500),
]
graph = [
 {"@type": "Organization", "@id": ORG, "name": "FluoDigital", "url": URL,
  "description": "FluoDigital runs the AI Invisibility Report: AI visibility audits for businesses in Dubai and the UAE, showing which competitors ChatGPT, Gemini, Perplexity and Google AI Overviews recommend instead of them, and a plan to change it.",
  "telephone": "+971522086253", "email": "rahulsoni25@gmail.com", "founder": {"@id": PERSON},
  "contactPoint": [{"@type": "ContactPoint", "contactType": "sales", "telephone": "+971522086253", "areaServed": "AE", "availableLanguage": ["English"]}],
  "location": {"@type": "Place", "name": "Dubai Silicon Oasis", "address": {"@type": "PostalAddress", "addressLocality": "Dubai", "addressCountry": "AE"}},
  "areaServed": AREA},
 {"@type": "Person", "@id": PERSON, "name": "Rahul Soni", "jobTitle": "Founder & Director", "worksFor": {"@id": ORG}},
 {"@type": "WebSite", "@id": SITE, "name": "WorkflowStacks", "url": BASE},
 {"@type": "WebPage", "@id": PAGE, "url": URL, "name": title, "description": desc, "inLanguage": "en",
  "isPartOf": {"@id": SITE}, "about": {"@id": SERVICE}, "mainEntity": {"@id": SERVICE}, "breadcrumb": {"@id": CRUMB}, "hasPart": {"@id": APP},
  "primaryImageOfPage": {"@type": "ImageObject", "url": MEDIA + "og.jpg", "width": 1200, "height": 630},
  "datePublished": PUBLISHED, "dateModified": MODIFIED},
 {"@type": "BreadcrumbList", "@id": CRUMB, "itemListElement": [
    {"@type": "ListItem", "position": 1, "name": "WorkflowStacks", "item": BASE},
    {"@type": "ListItem", "position": 2, "name": "AI Visibility Audit", "item": URL}]},
 {"@type": "Service", "@id": SERVICE, "name": "AI Invisibility Report", "alternateName": ["AI Visibility Audit", "AI visibility report"],
  "serviceType": "AI visibility audit", "category": "Generative engine optimisation (GEO) and answer engine optimisation (AEO)",
  "slogan": h1,
  "description": "An AI visibility audit that shows where ChatGPT, Gemini, Perplexity and Google AI Overviews recommend your competitors instead of you, which websites they cite, and a 90-day plan to fix it. " + REPORT_DESC,
  "url": URL, "image": MEDIA + "og.jpg", "provider": {"@id": ORG}, "brand": {"@id": ORG}, "areaServed": AREA,
  "audience": {"@type": "BusinessAudience", "audienceType": "Local service businesses, agencies and B2B founders in Dubai and the UAE"},
  "offers": report,
  "hasOfferCatalog": {"@type": "OfferCatalog", "name": "AI visibility pricing (excluding VAT)", "itemListElement": [
     {"@type": "OfferCatalog", "name": "The report", "itemListElement": report},
     {"@type": "OfferCatalog", "name": "After the report", "itemListElement": after}]}},
 {"@type": "WebApplication", "@id": APP, "name": "Free AI visibility scan", "url": URL + '#start',
  "description": "Builds six buyer prompts for your service and city, opens each one in ChatGPT, Gemini, Perplexity and Google, and scores how many answers name your business. Runs in the browser; nothing is sent unless you choose to send it.",
  "applicationCategory": "BusinessApplication", "operatingSystem": "Any (web browser)", "isAccessibleForFree": True,
  "offers": {"@type": "Offer", "price": "0", "priceCurrency": "AED"}, "provider": {"@id": ORG}},
 {"@type": "FAQPage", "@id": FAQ, "url": URL + '#faq', "mainEntity": [
    {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]},
]
data = {"@context": "https://schema.org", "@graph": graph}
out = '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '</script>'
new, n = re.subn(r'<script type="application/ld\+json">.*?</script>', lambda m: out, src, count=1, flags=re.S)
assert n == 1
P.write_text(new, encoding='utf-8')
json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', new, re.S).group(1))  # round-trip check
print('json-ld bytes:', len(out), '| types:', [g['@type'] for g in graph])
