# ngx-sitemaps

Generate sitemaps from Angular prerendered routes.

## Prerequisites

- Your project is an Angular project
- Your project uses SSR with static site generation (SSG)

## CLI usage

Before using the CLI, make sure to build your application.
Afterward, run the following CLI command to generate the sitemap:

```
npx ngx-sitemaps https://your-site.com
```

To run the script always after the build, install the package in your project
and set up a `postbuild` script in your `package.json`:

```json
{
	"scripts": {
		"build": "ng build",
		"postbuild": "ngx-sitemaps https://your-site.com"
	}
}
```

## Direct usage

If you already have a custom postbuild script, you can use the following code to generate the sitemap:

```javascript
import { generateSitemap } from "ngx-sitemaps";

await generateSitemap("https://your-site.com");
```

## Options

| Title          | CLI usage          | Direct usage    | Description                                                                   |
| -------------- | ------------------ | --------------- | ----------------------------------------------------------------------------- |
| Project        | `--project`        | `project`       | Project name in angular.json                                                  |
| Trailing Slash | `--trailing-slash` | `trailingSlash` | Adds a trailing slash to all paths                                            |
| Excluded Paths | `--excluded-paths` | `excludedPaths` | Paths to exclude from the sitemap. Supports wildcard patterns using `**`.     |
| Config         | `--config [path]`  | `configPath`    | Path to sitemap config file (defaults to `sitemap.config.jsonc` if it exists) |

### Config command options

| Title   | CLI usage         | Description                                                          |
| ------- | ----------------- | -------------------------------------------------------------------- |
| Project | `--project`       | Project name in angular.json                                         |
| Output  | `--output <path>` | Output path for the config file (defaults to `sitemap.config.jsonc`) |

## Per-route customization

The config file is **optional**. Use it only if you want to customize `lastmod`, `priority`, or `changefreq` per route without manually editing the sitemap after each generation.

### 1. Generate the config file

Run the following command to create or update `sitemap.config.jsonc` with all current routes:

```
npx ngx-sitemaps config
```

To write the config to a custom path:

```
npx ngx-sitemaps config --output path/to/sitemap.config.jsonc
```

This reads your `prerendered-routes.json` and creates a config file like:

```jsonc
{
	"$schema": "./node_modules/ngx-sitemaps/sitemap.config.schema.json",
	"routes": {
		"/": { "lastmod": null, "priority": null, "changefreq": null },
		"/blog/post-1": { "lastmod": null, "priority": null, "changefreq": null },
		"/contact": { "lastmod": null, "priority": null, "changefreq": null },
	},
}
```

Re-running the command will add new routes, preserve existing entries, and remove routes that no longer exist.

### 2. Edit the config file

Fill in the values you want to customize. Use `null` to fall back to the default (today's date for `lastmod`, omitted for `priority`/`changefreq`).
Wildcard patterns (`**`) are supported and match any route segment. Comments are supported:

```jsonc
{
	"$schema": "./node_modules/ngx-sitemaps/sitemap.config.schema.json",
	// Exclude admin and hidden paths from the sitemap
	"excludedPaths": ["/admin/**", "/hidden"],
	"routes": {
		// Home page
		"/": { "lastmod": "2025-01-01", "priority": 1.0, "changefreq": "weekly" },
		// All blog posts
		"/blog/**": { "lastmod": null, "priority": 0.8, "changefreq": "weekly" },
		"/contact": { "lastmod": "2025-01-15", "priority": 0.5, "changefreq": "monthly" },
	},
}
```

Specific routes take precedence over wildcard patterns. Paths matching `excludedPaths` are excluded from both the config and the sitemap.

### 3. Generate the sitemap with config

If `sitemap.config.jsonc` exists in the current directory, it is applied automatically:

```
npx ngx-sitemaps https://your-site.com
```

To use a custom config file path:

```
npx ngx-sitemaps https://your-site.com --config path/to/sitemap.config.jsonc
```
