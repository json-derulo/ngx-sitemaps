#!/usr/bin/env node

import { program } from "commander";
import packageInfo from "../package.json" with { type: "json" };
import { generateSitemap } from "./index.js";
import { generateConfig } from "./config.js";

const { name, description, version } = packageInfo;

program
	.name(name)
	.description(description)
	.version(version)
	.argument("<base-url>", "Absolute base URL of the site")
	.option("-p, --project <project>", "Project name in angular.json")
	.option("--trailing-slash", "With this option a trailing slash is added to all paths")
	.option("-e, --excluded-paths <excluded-paths...>", "Paths to exclude from the sitemap")
	.option("--config [path]", "Path to sitemap config file (defaults to sitemap.config.jsonc)")
	.action((baseUrl, options) => {
		const configPath = options.config === true ? undefined : options.config;
		return generateSitemap(baseUrl, { ...options, configPath });
	});

program
	.command("config")
	.description("Create or update sitemap.config.jsonc with all current routes")
	.option("-p, --project <project>", "Project name in angular.json")
	.option("-o, --output <path>", "Output path for the config file (defaults to sitemap.config.jsonc)")
	.action((options) => generateConfig(options.project, options.output));

program.parse();
