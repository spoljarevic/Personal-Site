# Personal Site — spoljarevic.sh

Static personal site with dark blue gradient theme, terminal-style hero, and Codeberg integration.

## Setup

1. **Add your photo**: Place `ls.jpg` in `images/profiles/`
2. **Edit `config.js`** if you need to change repos, links, or fallback blog posts
3. **Edit `now.html`** with your current focus
4. **Edit `about.html`** to personalize your bio

## Structure

```
├── index.html       # Landing page
├── about.html       # About me
├── now.html         # Now page
├── blog/
│   ├── index.html   # Blog listing (auto from Codeberg)
│   └── post.html    # Single post (used via redirect)
├── css/style.css
├── js/main.js
├── config.js        # Edit repos, links, etc.
└── _redirects       # Cloudflare Pages: /blog/* → post.html
```

## Deployment (Cloudflare Pages)

1. Push to GitHub (mirror from Codeberg)
2. In Cloudflare Pages, connect the repo
3. Build: leave empty (static site)
4. Output: root directory
5. `_redirects` enables `/blog/post-slug` URLs

## Codeberg API & CORS

The Codeberg API may block browser requests due to CORS. If projects or git activity don't load:

- **Blog posts** use `raw.codeberg.org` and usually work
- **Projects & commits** use `api.codeberg.org` and may need a CORS proxy

### Option: Cloudflare Worker proxy

Create a Worker that proxies `https://codeberg.org/api/v1/*` to your domain, then set in `config.js`:

```js
CODEBERG_API: 'https://your-worker.workers.dev',
```

## Blog format

Posts live in [Spoljarevic/Blog](https://codeberg.org/Spoljarevic/Blog) as:

```
2026-02-10 - Chess journey/
  └── README.md
```

Add `fallbackPosts` in `config.js` if the API listing fails, so the blog still shows posts.
