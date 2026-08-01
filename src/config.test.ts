import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { matchWildcard, matchRoute, generateConfig, SitemapConfig, RouteConfig } from "./config.js";

describe("matchWildcard", () => {
	it("matches /blog/post-1 against /blog/**", () => {
		expect(matchWildcard("/blog/post-1", "/blog/**")).toBe(true);
	});

	it("matches /blog/post-1/comments against /blog/**", () => {
		expect(matchWildcard("/blog/post-1/comments", "/blog/**")).toBe(true);
	});

	it("matches /admin against /admin exactly", () => {
		expect(matchWildcard("/admin", "/admin")).toBe(true);
	});

	it("does not match /admin/users against /admin", () => {
		expect(matchWildcard("/admin/users", "/admin")).toBe(false);
	});

	it("does not match /contact against /blog/**", () => {
		expect(matchWildcard("/contact", "/blog/**")).toBe(false);
	});

	it("matches /blog/post-1 against /blog/* (single star)", () => {
		expect(matchWildcard("/blog/post-1", "/blog/*")).toBe(true);
	});

	it("does not match /blog/post-1/comments against /blog/* (single star)", () => {
		expect(matchWildcard("/blog/post-1/comments", "/blog/*")).toBe(false);
	});
});

describe("matchRoute", () => {
	const routeConfig: RouteConfig = { lastmod: "2024-01-01", priority: 0.8, changefreq: "weekly" };
	const wildcardConfig: RouteConfig = { lastmod: null, priority: 0.5, changefreq: "monthly" };

	const config: SitemapConfig = {
		routes: {
			"/blog/exact": routeConfig,
			"/blog/**": wildcardConfig,
		},
	};

	it("returns exact route config on exact match", () => {
		expect(matchRoute("/blog/exact", config)).toBe(routeConfig);
	});

	it("returns wildcard route config on wildcard match", () => {
		expect(matchRoute("/blog/some-post", config)).toBe(wildcardConfig);
	});

	it("exact match takes precedence over wildcard", () => {
		expect(matchRoute("/blog/exact", config)).toBe(routeConfig);
	});

	it("returns null when no match", () => {
		expect(matchRoute("/contact", config)).toBeNull();
	});
});

describe("generateConfig", () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(tmpdir(), "ngx-sitemaps-test-"));
		vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await rm(tmpDir, { recursive: true, force: true });
	});

	async function setupFiles(project: string, routes: string[], existingConfig?: string) {
		const angularJson = { projects: { [project]: {} } };
		await writeFile(path.join(tmpDir, "angular.json"), JSON.stringify(angularJson));

		const distDir = path.join(tmpDir, "dist", project);
		await mkdir(distDir, { recursive: true });
		const prerenderedRoutes: Record<string, object> = {};
		for (const r of routes) prerenderedRoutes[r] = {};
		await writeFile(path.join(distDir, "prerendered-routes.json"), JSON.stringify({ routes: prerenderedRoutes }));

		if (existingConfig !== undefined) {
			await writeFile(path.join(tmpDir, "sitemap.config.jsonc"), existingConfig);
		}
	}

	it("fresh generation: creates config with all routes and null values", async () => {
		await setupFiles("my-app", ["/", "/about", "/contact"]);
		await generateConfig();

		const text = await readFile(path.join(tmpDir, "sitemap.config.jsonc"), "utf-8");
		const config = JSON.parse(text) as SitemapConfig;

		expect(config.routes["/"]).toEqual({ lastmod: null, priority: null, changefreq: null });
		expect(config.routes["/about"]).toEqual({ lastmod: null, priority: null, changefreq: null });
		expect(config.routes["/contact"]).toEqual({ lastmod: null, priority: null, changefreq: null });
	});

	it("re-generation: preserves existing entries, adds new routes, removes deleted routes", async () => {
		const existing: SitemapConfig = {
			routes: {
				"/": { lastmod: "2024-01-01", priority: 1.0, changefreq: "daily" },
				"/old-page": { lastmod: null, priority: null, changefreq: null },
			},
		};
		await setupFiles("my-app", ["/", "/about"], JSON.stringify(existing));
		await generateConfig();

		const text = await readFile(path.join(tmpDir, "sitemap.config.jsonc"), "utf-8");
		const config = JSON.parse(text) as SitemapConfig;

		expect(config.routes["/"]).toEqual({ lastmod: "2024-01-01", priority: 1.0, changefreq: "daily" });
		expect(config.routes["/about"]).toEqual({ lastmod: null, priority: null, changefreq: null });
		expect(config.routes["/old-page"]).toBeUndefined();
	});

	it("re-generation: preserves comments in existing config", async () => {
		const existingWithComment = `{
	// This is a comment
	"routes": {
		"/": { "lastmod": null, "priority": null, "changefreq": null }
	}
}`;
		await setupFiles("my-app", ["/", "/about"], existingWithComment);
		await generateConfig();

		const text = await readFile(path.join(tmpDir, "sitemap.config.jsonc"), "utf-8");
		expect(text).toContain("// This is a comment");
	});

	it("excluded paths: routes matching excludedPaths are skipped/removed", async () => {
		const existing: SitemapConfig = {
			excludedPaths: ["/admin/**"],
			routes: {
				"/": { lastmod: null, priority: null, changefreq: null },
				"/admin/dashboard": { lastmod: null, priority: null, changefreq: null },
			},
		};
		await setupFiles("my-app", ["/", "/admin/dashboard", "/admin/users"], JSON.stringify(existing));
		await generateConfig();

		const text = await readFile(path.join(tmpDir, "sitemap.config.jsonc"), "utf-8");
		const config = JSON.parse(text) as SitemapConfig;

		expect(config.routes["/"]).toBeDefined();
		expect(config.routes["/admin/dashboard"]).toBeUndefined();
		expect(config.routes["/admin/users"]).toBeUndefined();
	});
});
