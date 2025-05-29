#!/usr/bin/env node

import { program } from "commander";
import packageInfo from "../package.json" with { type: "json" };
import { generateSitemap } from "./index.js";

const { name, description, version } = packageInfo;

program
	.name(name)
	.description(description)
	.version(version)
	.argument("<base-url>", "Absolute base URL of the site")
	.option("-p, --project <project>", "Project name in angular.json")
	.action((baseUrl, options) => generateSitemap(baseUrl, options));

program.parse();
