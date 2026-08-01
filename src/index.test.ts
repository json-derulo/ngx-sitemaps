import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateSitemap } from "./index.js";

describe("generateSitemap", () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(tmpdir(), "ngx-sitemaps-test-"));
		vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await rm(tmpDir, { recursive: true, force: true });
	});

	async function setupProject(projectName: string, routes: Record<string, object>) {
		await writeFile(path.join(tmpDir, "angular.json"), JSON.stringify({ projects: { [projectName]: {} } }));
		const distProjectDir = path.join(tmpDir, "dist", projectName);
		await mkdir(distProjectDir, { recursive: true });
		await writeFile(path.join(distProjectDir, "prerendered-routes.json"), JSON.stringify({ routes }));
		await mkdir(path.join(distProjectDir, "browser"), { recursive: true });
	}

	async function readSitemap(projectName: string): Promise<string> {
		return readFile(path.join(tmpDir, "dist", projectName, "browser", "sitemap.xml"), "utf-8");
	}

	it("generates basic sitemap with correct <loc> and <lastmod>", async () => {
		const today = new Date().toISOString().slice(0, 10);
		await setupProject("my-app", { "/": {}, "/about": {} });

		await generateSitemap("https://example.com", { project: "my-app" });

		const xml = await readSitemap("my-app");
		expect(xml).toContain("<loc>https://example.com/</loc>");
		expect(xml).toContain("<loc>https://example.com/about</loc>");
		expect(xml).toContain(`<lastmod>${today}</lastmod>`);
	});

	it("adds trailing slash when trailingSlash is true", async () => {
		await setupProject("my-app", { "/": {}, "/about": {} });

		await generateSitemap("https://example.com", { project: "my-app", trailingSlash: true });

		const xml = await readSitemap("my-app");
		expect(xml).toContain("<loc>https://example.com/</loc>");
		expect(xml).toContain("<loc>https://example.com/about/</loc>");
	});

	it("excludes paths matching excludedPaths CLI option", async () => {
		await setupProject("my-app", { "/": {}, "/about": {}, "/secret": {} });

		await generateSitemap("https://example.com", { project: "my-app", excludedPaths: ["/secret"] });

		const xml = await readSitemap("my-app");
		expect(xml).toContain("<loc>https://example.com/</loc>");
		expect(xml).toContain("<loc>https://example.com/about</loc>");
		expect(xml).not.toContain("/secret");
	});

	it("excludes paths matching wildcard in excludedPaths", async () => {
		await setupProject("my-app", { "/": {}, "/blog/post-1": {}, "/about": {} });

		await generateSitemap("https://example.com", { project: "my-app", excludedPaths: ["/blog/**"] });

		const xml = await readSitemap("my-app");
		expect(xml).toContain("<loc>https://example.com/</loc>");
		expect(xml).toContain("<loc>https://example.com/about</loc>");
		expect(xml).not.toContain("/blog/post-1");
	});

	it("uses custom lastmod from sitemap.config.jsonc", async () => {
		await setupProject("my-app", { "/": {}, "/about": {} });
		const config = {
			routes: { "/about": { lastmod: "2024-01-15", priority: null, changefreq: null } },
		};
		await writeFile(path.join(tmpDir, "sitemap.config.jsonc"), JSON.stringify(config));

		await generateSitemap("https://example.com", { project: "my-app" });

		const xml = await readSitemap("my-app");
		expect(xml).toContain("<loc>https://example.com/about</loc>");
		expect(xml).toContain("<lastmod>2024-01-15</lastmod>");
	});

	it("includes priority and changefreq from config when present", async () => {
		await setupProject("my-app", { "/": {}, "/about": {} });
		const config = {
			routes: { "/about": { lastmod: null, priority: 0.8, changefreq: "monthly" } },
		};
		await writeFile(path.join(tmpDir, "sitemap.config.jsonc"), JSON.stringify(config));

		await generateSitemap("https://example.com", { project: "my-app" });

		const xml = await readSitemap("my-app");
		expect(xml).toContain("<priority>0.8</priority>");
		expect(xml).toContain("<changefreq>monthly</changefreq>");
		// Root route has no priority/changefreq
		const rootUrlBlock = xml.split("<url>").find((block) => block.includes("example.com/</loc>"));
		expect(rootUrlBlock).not.toContain("<priority>");
		expect(rootUrlBlock).not.toContain("<changefreq>");
	});

	it("excludes paths matching config excludedPaths", async () => {
		await setupProject("my-app", { "/": {}, "/about": {}, "/admin": {} });
		const config = { excludedPaths: ["/admin"], routes: {} };
		await writeFile(path.join(tmpDir, "sitemap.config.jsonc"), JSON.stringify(config));

		await generateSitemap("https://example.com", { project: "my-app" });

		const xml = await readSitemap("my-app");
		expect(xml).toContain("<loc>https://example.com/</loc>");
		expect(xml).toContain("<loc>https://example.com/about</loc>");
		expect(xml).not.toContain("/admin");
	});

	it("applies wildcard route config to matching paths", async () => {
		await setupProject("my-app", { "/": {}, "/blog/post-1": {} });
		const config = {
			routes: { "/blog/**": { lastmod: null, priority: 0.5, changefreq: "weekly" } },
		};
		await writeFile(path.join(tmpDir, "sitemap.config.jsonc"), JSON.stringify(config));

		await generateSitemap("https://example.com", { project: "my-app" });

		const xml = await readSitemap("my-app");
		expect(xml).toContain("<loc>https://example.com/blog/post-1</loc>");
		expect(xml).toContain("<priority>0.5</priority>");
		expect(xml).toContain("<changefreq>weekly</changefreq>");
	});
});
