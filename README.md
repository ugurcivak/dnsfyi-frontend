# dnsfyi Frontend v1.4.0

> DNS diagnostic tool — DNS lookup, WHOIS, SSL, email security, port scanner, blacklist, typosquatting detection, email header analyzer. 20+ tools, no sign-up.

**This is the frontend only.** The backend API is private.

---

## Features

| Category | Tools |
|----------|-------|
| **DNS** | A, AAAA, MX, NS, TXT, SOA, CNAME, CAA, SRV, DNSSEC, DNS propagation (25 resolvers), latency |
| **Email Security** | SPF, DKIM (25+ selectors), DMARC, BIMI, MTA-STS, TLS-RPT |
| **Email Header Analyzer** | RFC 5322 parser, hop timeline with TLS/cipher, geo/ASN inline, ARC chain, phishing detection |
| **SSL/TLS** | Protocol, cipher, cert chain, expiry, OCSP, fingerprint |
| **Blacklist** | 28 DNSBL checks (Spamhaus, SpamCop, Barracuda, SORBS, etc.) |
| **Port Scanner** | 21 common ports + custom port |
| **WHOIS** | IANA referral chain, full parsed output |
| **Subdomain Discovery** | 87-word brute-force |
| **Typosquatting** | Homoglyph, hyphenation, insertion, omission, transposition, TLD-swap |
| **ASN / IP Info** | AS number, prefix, ISP, country |
| **Reverse DNS** | PTR + reverse IP lookup |
| **Tech Stack** | Hosting/CDN/email provider fingerprint |
| **Security Headers** | HSTS, CSP, XFO, etc. + scoring |

## Quick Start

```bash
npx serve .
```

Open `http://localhost:8080` — API calls will fail without the backend.

## Project Structure

```
├── index.html           # Turkish UI (served at /tr/)
├── index-en.html        # English UI (served at /)
├── script.js            # All UI logic
├── style.css            # Light/dark theme, responsive grid
└── libs/                # Third-party libraries
    ├── html2canvas.min.js
    └── jspdf.umd.min.js
```

## Tech Stack

- **Vanilla JS** — No framework, no build step
- **CSS Grid / Flexbox** — Responsive layout
- **html2canvas + jsPDF** — PDF export
- **i18n** — Turkish + English (cookie + Accept-Language detection)

## License

MIT
