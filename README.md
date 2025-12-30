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

| Title          | CLI usage          | Direct usage    | Description                        |
| -------------- | ------------------ | --------------- | ---------------------------------- |
| Project        | `--project`        | `project`       | Project name in angular.json       |
| Trailing Slash | `--trailing-slash` | `trailingSlash` | Adds a trailing slash to all paths |
