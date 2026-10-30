# Portfolio

A responsive professional portfolio with two interactive project demos, implementation documentation and reusable source. No build dependencies, tracking, or third-party APIs are required to use the website.

## Run locally

Requires Node.js 20+ for tests/CLI and Python 3 for the preview/checker. No npm installation is required.

```bash
python3 -m http.server 8000
# Open http://localhost:8000
npm test
npm run validate
```

Serve over HTTP rather than double-clicking HTML because demos use ES modules. On GitHub Pages and normal static hosting, the same relative links work under a repository subpath.

## Projects

| Project | Implemented here | Microsoft environment work remaining |
| --- | --- | --- |
| ProcessDesk | Browser request queue; category routing; approve/reject/timeout; immutable transition logic; audit history; search/filter; local persistence; CSV export; tests | Build native Canvas app and cloud flows from provided formulas, schema script and guide; configure permissions and connections; run UAT; export genuine solution |
| Migration Assurance | Browser and CLI inventory comparator; input validation; missing/extra/mismatch detection; CSV/JSON export; synthetic fixtures; tests | Test optional read-only PnP export against an authorized SharePoint Online sandbox |

ProcessDesk is a browser prototype and a native implementation kit, not a deployed Power Apps product. There is no importable .msapp or Microsoft solution ZIP in this package. The optional AI-assisted triage extension is a roadmap item, not an implemented AI feature. No prototype time-savings, adoption or business outcomes are invented.

- [ProcessDesk case study](projects/processdesk/index.html)
- [ProcessDesk native build guide](projects/processdesk/BUILD.md)
- [Migration Assurance case study](projects/migration-assurance/index.html)
- [Migration Assurance build guide](projects/migration-assurance/BUILD.md)
- [Resume project language and interview preparation](RESUME_PROJECTS.md)
- [Publishing and maintenance](PUBLISH.md)

## Website structure

- `index.html`: portfolio and professional experience.
- `assets/`: styles, browser modules, favicon, current supplied resume PDF.
- `demos/`: two interactive workspaces.
- `projects/`: implementation assets, executable logic, guides and sample data.
- `tests/`: meaningful state-transition and inventory edge-case tests.
- `scripts/check_site.py`: internal link and ES-module import checks.
- `.github/workflows/static.yml`: GitHub Pages deployment workflow.

## Content and privacy

Ganesh Polimera’s Microsoft 365 and Power Platform portfolio. Professional experience and work-scope figures are based on the supplied resume. The resume PDF is included in `assets/`.

107 sites, 40 sites, and 57 sites describe reported work scope, not counts of projects built here. The 138/105 example is a reported investigation; all downloadable fixtures are synthetic. No employer exports, tenant URLs, user names or access credentials are included.

The browser queue simulates both requester and reviewer roles. Browser localStorage and hidden buttons are not access control. See BUILD.md for the native authorization design. Uploaded inventory JSON is processed within the browser tab. Static hosting may maintain its own request logs.

## Validation

Run `npm test` and `npm run validate`. Browser QA and live deployment details are recorded in VALIDATION.md. PowerShell scripts and native Microsoft integrations require tenant validation; static tests do not establish that they work in a tenant.

## License

Source code is MIT licensed. Personal resume content and personal branding are excluded from the source-code license; replace them before reusing this portfolio for another person.
