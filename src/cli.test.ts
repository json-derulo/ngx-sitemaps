import { describe, it, expect } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const CLI = new URL("../src/cli.ts", import.meta.url).pathname;

describe("cli smoke tests", () => {
	it("prints version with --version", async () => {
		const { stdout } = await execFileAsync("tsx", [CLI, "--version"]);
		expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
	});

	it("prints help with --help", async () => {
		const { stdout } = await execFileAsync("tsx", [CLI, "--help"]);
		expect(stdout).toContain("ngx-sitemaps");
		expect(stdout).toContain("base-url");
	});
});
