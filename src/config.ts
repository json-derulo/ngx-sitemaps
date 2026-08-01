import fs from "node:fs/promises";
import path from "node:path";
import { applyEdits, modify, parse } from "jsonc-parser";

export interface RouteConfig {
	lastmod: string | null;
	priority: number | null;
	changefreq: string | null;
}

export interface SitemapConfig {
	excludedPaths?: string[];
	routes: Record<string, RouteConfig>;
}

const CONFIG_FILE = "sitemap.config.jsonc";

const MODIFY_OPTIONS = { formattingOptions: { tabSize: 1, insertSpaces: false } };

export async function generateConfig(project?: string, outputPath?: string): Promise<void> {
	if (!project) {
		const configLocation = path.join(process.cwd(), "angular.json");
		const config = JSON.parse(await fs.readFile(configLocation, "utf-8"));
		project = Object.keys(config.projects).at(0);
	}

	if (!project) {
		console.error("No project found in angular.json");
		process.exit(1);
	}

	const prerenderedRoutesPath = path.join(process.cwd(), "dist", project, "prerendered-routes.json");
	const { routes: prerenderedRoutes } = JSON.parse(await fs.readFile(prerenderedRoutesPath, "utf-8"));
	const currentRoutes: string[] = Object.keys(prerenderedRoutes);

	const configPath = outputPath ?? path.join(process.cwd(), CONFIG_FILE);
	let existingText = "";
	let existingConfig: SitemapConfig = { routes: {} };

	try {
		existingText = await fs.readFile(configPath, "utf-8");
		existingConfig = parse(existingText) as SitemapConfig;
	} catch {
		// Config doesn't exist yet, start fresh
	}

	// Start from existing text (preserves comments) or a fresh object with $schema
	let text = existingText || JSON.stringify({ $schema: "./node_modules/ngx-sitemaps/sitemap.config.schema.json" });

	const excludedPaths: string[] = existingConfig.excludedPaths ?? [];

	// Remove routes that no longer exist or are now excluded
	for (const route of Object.keys(existingConfig.routes ?? {})) {
		if (!currentRoutes.includes(route) || excludedPaths.some((pattern) => matchWildcard(route, pattern))) {
			text = applyEdits(text, modify(text, ["routes", route], undefined, MODIFY_OPTIONS));
		}
	}

	// Add new routes (preserve existing ones untouched, skip excluded)
	for (const route of currentRoutes) {
		if (!excludedPaths.some((pattern) => matchWildcard(route, pattern)) && !existingConfig.routes?.[route]) {
			const newEntry: RouteConfig = { lastmod: null, priority: null, changefreq: null };
			text = applyEdits(text, modify(text, ["routes", route], newEntry, MODIFY_OPTIONS));
		}
	}

	await fs.writeFile(configPath, text);
	console.log(`Config written to ${configPath}`);
}

export async function loadConfig(configPath: string): Promise<SitemapConfig | null> {
	try {
		return parse(await fs.readFile(configPath, "utf-8")) as SitemapConfig;
	} catch {
		return null;
	}
}

export function matchRoute(route: string, config: SitemapConfig): RouteConfig | null {
	// Exact match takes precedence
	if (config.routes[route]) {
		return config.routes[route];
	}

	// Wildcard matching
	for (const pattern of Object.keys(config.routes)) {
		if (pattern.includes("**") && matchWildcard(route, pattern)) {
			return config.routes[pattern];
		}
	}

	return null;
}

export function matchWildcard(route: string, pattern: string): boolean {
	const regexStr = pattern.replace(/\*\*/g, "\x00").replace(/\*/g, "[^/]*").replace(/\x00/g, ".*");
	const regex = new RegExp(`^${regexStr}$`);
	return regex.test(route);
}
