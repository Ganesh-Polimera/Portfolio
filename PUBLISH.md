# Publish the Portfolio

This repository contains the portfolio website and two projects: ProcessDesk and Migration Assurance.

## GitHub Pages

1. Open Settings → General and set repository visibility to Public.
2. Open Settings → Pages and choose GitHub Actions as the build source.
3. Run the Deploy static content to Pages workflow from Actions, or push a change to main.
4. Wait for a successful github-pages deployment. Use the website URL shown by GitHub and test it in a signed-out browser.

The Pages workflow publishes the repository root. Relative links support the repository subpath.

## Run locally

```bash
python3 -m http.server 8000
npm test
npm run validate
```

Open http://localhost:8000. No npm installation or external service is required for the browser demos.

## Maintain

Edit index.html to update the profile. Replace assets/Ganesh_Power_Platform.pdf with the approved resume or update its links. Keep the project demos and implementation assets under projects/ and demos/. Run the tests and link checker before publishing changes.

The demos use synthetic data. Native Power Apps and Power Automate deployment is separate from website publication; follow the project build guides and complete permission tests and UAT in an authorized sandbox.
