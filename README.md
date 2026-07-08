# 🔭 dnsfyi Frontend v1.4.0

> 🚀 **Live at [www.dnsfyi.com](https://www.dnsfyi.com)** — 20+ DNS & domain analysis tools, free, no sign-up.

**This is the frontend only.** The backend API is private.

![badge](https://img.shields.io/badge/version-1.4.0-blue?style=flat)
![badge](https://img.shields.io/badge/license-MIT-green?style=flat)

---

## ✨ Features

| Category | Tools |
|----------|-------|
| 🔍 **DNS** | A, AAAA, MX, NS, TXT, SOA, CNAME, CAA, SRV, DNSSEC, DNS propagation (25 global resolvers), latency benchmarking |
| 📧 **Email Security** | SPF, DKIM (25+ selectors), DMARC, BIMI, MTA-STS, TLS-RPT, MX TTL consistency |
| ✉️ **Email Header Analyzer** | RFC 5322 parser, hop timeline with TLS/cipher, geo/ASN inline, ARC chain, phishing detection |
| 🔒 **SSL/TLS** | Protocol version, cipher strength, certificate chain, expiry, OCSP, TLS fingerprint |
| ⚠️ **Blacklist** | 28 DNSBL checks (Spamhaus, SpamCop, Barracuda, SORBS, etc.) |
| 🔌 **Port Scanner** | 21 common ports + custom port |
| 📄 **WHOIS** | IANA referral chain, full parsed output |
| 🌐 **Subdomain Discovery** | 87-word brute-force (50 concurrent, 3s timeout) |
| 🕵️ **Typosquatting** | Homoglyph, hyphenation, insertion, omission, transposition, TLD-swap |
| 📡 **ASN / IP Info** | AS number, prefix, ISP, country, allocation date |
| 🔄 **Reverse DNS** | PTR lookup + reverse IP (domains on same IP) |
| 🏢 **Tech Stack** | Hosting/CDN/email provider fingerprint (40+ providers) |
| 🛡️ **Security Headers** | HSTS, CSP, XFO, etc. + scoring |
| 📊 **Health Score** | 0-100 scoring for DNS, email, SSL, ports |
| 🌙 **Dark Mode** | Light/dark theme with system preference detection |

## 🚀 Quick Start

```bash
npx serve .
```

Open `http://localhost:8080` — API calls will fail without the backend.

## 📁 Project Structure

```
├── index.html           # Turkish UI (served at /tr/)
├── index-en.html        # English UI (served at /)
├── script.js            # All UI logic
├── style.css            # Light/dark theme, responsive grid
└── libs/                # Third-party libraries
    ├── html2canvas.min.js
    └── jspdf.umd.min.js
```

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla JS (no framework) |
| **Layout** | CSS Grid / Flexbox |
| **PDF Export** | html2canvas + jsPDF |
| **i18n** | Turkish + English (cookie + Accept-Language) |
| **Theme** | CSS custom properties, system preference |

## 📄 License

MIT
