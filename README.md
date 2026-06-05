# Gabriel Buron — Portfolio

A static portfolio site that reads `portfolio.md` and renders it automatically.  
No build step. No framework. Just drop it on Cloudflare Pages.

## 📁 Structure

```
gabriel-portfolio/
├── index.html       ← entry point
├── style.css        ← styles
├── main.js          ← markdown parser + renderer
├── portfolio.md     ← YOUR CONTENT — edit this file!
├── _headers         ← Cloudflare security & cache headers
└── README.md
```

## ✏️ Updating Your Portfolio

Edit `portfolio.md` and push. The site re-renders automatically.

**Supported sections:**
- `## Summary`
- `## Experience`
- `## Education`
- `## Skills`
- `## Certifications`
- `## Awards and Honors`
- `## Projects`

## 🚀 Deploy to Cloudflare Pages

### Option 1 — Via Git (recommended)

1. Push this folder to a GitHub or GitLab repository
2. Go to [Cloudflare Pages](https://pages.cloudflare.com/) → **Create a project**
3. Connect your repo
4. Set build settings:
   - **Framework preset:** `None`
   - **Build command:** *(leave empty)*
   - **Build output directory:** `/` (root)
5. Click **Save and Deploy**

Every push to your main branch will redeploy automatically.

### Option 2 — Direct Upload (Wrangler CLI)

```bash
npm install -g wrangler
wrangler pages deploy . --project-name=gabriel-portfolio
```

### Option 3 — Drag & Drop

Go to [Cloudflare Pages](https://pages.cloudflare.com/) → **Direct Upload** → drag the folder.
