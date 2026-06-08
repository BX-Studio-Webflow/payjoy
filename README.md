# PayJoy Careers

A Webflow careers listing that fetches open roles from the [Lever API](https://hire.lever.co/), renders them grouped by department, and supports live filtering by department, location, and job title.

## CDN

```html
<script defer src="https://cdn.jsdelivr.net/gh/BX-Studio-Webflow/payjoy@9ddfd3c/dist/index.js"></script>
```

Direct link: https://cdn.jsdelivr.net/gh/BX-Studio-Webflow/payjoy@9ddfd3c/dist/index.js

Replace `9ddfd3c` with the latest commit SHA after each release.

## Reference

- [CDN](#cdn)
- [Using the Careers Listing](#using-the-careers-listing)
  - [HTML Structure](#html-structure)
  - [Required Elements](#required-elements)
  - [Filter Dropdowns](#filter-dropdowns)
  - [Integration](#integration)
  - [How Filtering Works](#how-filtering-works)
- [Included tools](#included-tools)
- [Requirements](#requirements)
- [Getting started](#getting-started)
  - [Installing](#installing)
  - [Building](#building)
  - [Serving files on development mode](#serving-files-on-development-mode)
- [Pre-defined scripts](#pre-defined-scripts)
- [Release Process](#release-process)

## Using the Careers Listing

On page load, the script:

1. Fetches jobs from `https://api.lever.co/v0/postings/payjoy?mode=json&group=department`
2. Clones Webflow templates to render department groups and job rows
3. Populates three filter dropdowns from the API data
4. Applies filters instantly when a dropdown option is selected

The script exits quietly on pages without a `.careers-list` container, so it is safe to include site-wide.

### HTML Structure

The page needs one results container, two templates, and three Webflow dropdowns.

```html
<!-- Filter bar (3 Webflow dropdowns in this order) -->
<div class="dropdown w-dropdown"><!-- Region / department --></div>
<div class="dropdown w-dropdown"><!-- Location --></div>
<div class="dropdown w-dropdown"><!-- Job title --></div>

<!-- Optional search button -->
<div class="button-main-wrap">
  <div class="clickable_btn">Search</div>
</div>

<!-- Results container -->
<div class="careers-list"></div>

<!-- Department group template (removed from DOM on init, used as clone source) -->
<div dev-target="department-group">
  <div class="career_dept_name">
    <h1 class="u-heading">Department Name</h1>
  </div>
  <div dev-target="career-list">
    <!-- Job rows are injected here -->
  </div>
</div>

<!-- Job row template (removed from DOM on init, used as clone source) -->
<div dev-target="career-item">
  <div class="career_role">
    <div class="u-text">Role Title</div>
  </div>
  <div class="career_city">
    <div class="u-text">City</div>
  </div>
  <div class="clickable_btn">
    <div class="button-main-text">Learn More</div>
  </div>
</div>
```

### Required Elements

| Selector / attribute | Purpose |
| --- | --- |
| `.careers-list` | Container where department groups are rendered |
| `[dev-target="department-group"]` | Template for each department section |
| `[dev-target="career-list"]` | Container inside a department for job rows |
| `[dev-target="career-item"]` | Template for a single job posting |
| `.dropdown.w-dropdown` (×3) | Filter dropdowns, in order: department, location, title |
| `.button-main-wrap .clickable_btn` | Optional search button (re-applies current filters) |

Inside each rendered job row, the script updates:

- **Role title** — `.career_role .u-text`
- **Location(s)** — `.career_city .u-text` (uses `allLocations` when available)
- **Learn More** — `.clickable_btn` opens the Lever posting in a new tab

If `[dev-target="department-group"]` or `[dev-target="career-item"]` is missing, the script logs an error and stops.

### Filter Dropdowns

The three `.dropdown.w-dropdown` elements are matched by index:

| Index | Placeholder label | Filters by |
| --- | --- | --- |
| 0 | `Region: All` | Department group title (e.g. Finance, Operations) |
| 1 | `Location` | Primary location or any value in `allLocations` |
| 2 | `Job title` | Role name (`posting.text`) |

Each dropdown must contain:

- `.w-dropdown-list` — option list (rebuilt from API data)
- `.w-dropdown-toggle` — stores the selected value
- `.fitler-dropdown-text-wrapper .text-size-regular` — visible label

Selecting an option filters immediately. Choosing the placeholder option (e.g. `Region: All`) clears that filter.

### Integration

1. **Add the script to your Webflow careers page:**

```html
<script defer src="https://cdn.jsdelivr.net/gh/BX-Studio-Webflow/payjoy@9ddfd3c/dist/index.js"></script>
```

For local development:

```html
<script defer src="http://localhost:3000/index.js"></script>
```

2. **Add the HTML structure** shown above with your Webflow styles.

3. **Publish.** On load, all roles appear grouped by department. Filters update the list without a page reload.

### How Filtering Works

Jobs are fetched once on init and cached in memory. All filtering happens client-side:

- **Department** — shows only the matching department group
- **Location** — keeps postings where the selected city matches `categories.location` or appears in `categories.allLocations`
- **Job title** — keeps postings whose role name matches exactly

Filters can be combined. For example, selecting **Finance** and **New York City, NY** shows only finance roles available in that location.

When no roles match, the list shows `No roles found.`

## Included tools

- [Typescript](https://www.typescriptlang.org/)
- [Prettier](https://prettier.io/)
- [ESLint](https://eslint.org/) with [Finsweet's config](https://github.com/finsweet/eslint-config)
- [Playwright](https://playwright.dev/)
- [esbuild](https://esbuild.github.io/)
- [Changesets](https://github.com/changesets/changesets)
- [Finsweet's TypeScript Utils](https://github.com/finsweet/ts-utils)

## Requirements

This project uses [pnpm](https://pnpm.io/installation):

```bash
npm i -g pnpm
```

## Getting started

### Installing

```bash
pnpm install
```

Optional, for Playwright tests:

```bash
pnpm playwright install
```

### Building

- `pnpm dev` — watch mode + local server at `http://localhost:3000`
- `pnpm build` — production output in `dist/`

### Serving files on development mode

When you run `pnpm dev`:

- esbuild rebuilds on save
- Files are served at `http://localhost:3000`
- Live reload is enabled by default (configurable in `bin/build.js`)

## Pre-defined scripts

- `pnpm dev` — development build + local server
- `pnpm build` — production build
- `pnpm lint` — ESLint + Prettier check
- `pnpm lint:fix` — auto-fix lint issues
- `pnpm check` — TypeScript type check
- `pnpm format` — format with Prettier
- `pnpm test` — run Playwright tests

## Release Process

1. **Create a changeset**

   ```bash
   pnpm changeset
   ```

2. **Apply version bump**

   ```bash
   pnpm changeset version
   ```

3. **Tag and push**

   ```bash
   git tag v0.0.2
   git push origin v0.0.2
   ```

4. **Update the Webflow script tag** with the new commit SHA:

   ```html
   <script defer src="https://cdn.jsdelivr.net/gh/BX-Studio-Webflow/payjoy@COMMIT_SHA/dist/index.js"></script>
   ```
