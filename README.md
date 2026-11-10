# Personal site on GitHub Pages

A static, three-page site (hash routing in one `index.html`):

- **home**: intro with avatar, focus areas, certifications, security practice (bug bounty and platform ratings), skills and recent projects. Skills and projects are read live from your public GitHub repos.
- **blogs**: a weekly security briefing (lead story, being exploited, research, news, Hacker News) plus a searchable, paginated archive.
- **contact**: your public links.

## Set up

1. Create a repository and push these files to the `main` branch.
2. In the repository, open Settings, then Pages, and set **Source** to **GitHub Actions**.
3. Edit the `CONFIG` block near the top of the script in `index.html`: name, tagline, bio, focus, certifications, practice, links and GitHub username. Email, resume and "now" are optional and hidden while empty.
4. Replace `assets/avatar.png` with your own image (it is also the favicon). If the file is missing, the image hides itself.
5. Edit `FEEDS` in `scripts/build-feeds.mjs`.
6. Push. Open the Actions tab and run **Build and deploy** once if it hasn't started on its own.

The site goes live at `https://<user>.github.io/<repo>/` (or `https://<user>.github.io/` if the repo is named `<user>.github.io`).

## How it works

- Hacker News stories are fetched live in the visitor's browser from the Algolia HN API.
- Most blogs don't allow cross-origin requests, so the workflow fetches their RSS/Atom feeds every 3 hours,
  keeps posts from the last 30 days (dropping podcasts, funding news and other noise), tags each as
  `exploited`, `research` or `news`, and writes `feeds.json`. A feed that fails is skipped.
- `feeds.json` is rebuilt from scratch on every run and deployed with the page; it is never committed back.
- GitHub data comes from the public GitHub API. If it is rate-limited, those blocks are simply hidden.
- The browser tab title glitches in short bursts on a loop (`setTitle` in `index.html`; change `GLITCH_PAUSE` for the gap between bursts). It stays still for visitors who prefer reduced motion.
- The deploy workflow copies `index.html`, `feeds.json` and the `assets/` folder, so any new file you reference must live in one of those.
- No cookies, tracking or accounts. The browser only caches the public Hacker News list for a few minutes.

## Preview locally

    node scripts/build-feeds.mjs   # writes feeds.json
    python3 -m http.server 8000

Then open http://localhost:8000.
