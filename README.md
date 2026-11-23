# counting-pixels

Static landing page for countingpixels.com — plain HTML, CSS and JS, no build step.

- `index.html`, `styles.css`, `main.js`, `favicon.svg` — the site
- `Dockerfile` + `nginx.conf` — serves the files with nginx on port 80

## Local preview

    docker build -t countingpixels . && docker run --rm -p 8080:80 countingpixels

or just open `index.html` in a browser.

## Deploy (Coolify)

Create an application from this Git repo with the **Dockerfile** build pack and port **80**.
