# dnsfyi Frontend

Free DNS diagnostic tool — DNS lookup, WHOIS, SSL, email security, port scanner, blacklist, typosquatting detection. 20+ tools, no sign-up.

**This is the frontend only.** The backend API is private.

---

## Quick Start

```bash
# Serve locally with any static server
npx serve .
```

Then open `http://localhost:8080`

> API calls will fail without the backend.

## Project Structure

```
├── index.html           # Turkish UI
├── index-en.html        # English UI
├── script.js            # All UI logic
├── style.css            # Light/dark theme, responsive grid
├── libs/                # Third-party libraries
│   ├── html2canvas.min.js
│   └── jspdf.umd.min.js
├── manifest.json        # PWA manifest
├── robots.txt           # SEO
└── sitemap.xml          # SEO
```

## Tech Stack

- **Vanilla JS** — No framework, no build step
- **CSS Grid / Flexbox** — Responsive layout
- **html2canvas + jsPDF** — PDF export

## License

MIT
