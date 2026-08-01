import { describe, it, expect, vi } from "vitest";
import { getCurrentDate, handleTrailingSlash } from "./utils.js";

describe("getCurrentDate", () => {
	it("returns a date in YYYY-MM-DD format", () => {
		expect(getCurrentDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it("returns today's date", () => {
		const mockDate = new Date("2025-06-15");
		vi.useFakeTimers();
		vi.setSystemTime(mockDate);

		expect(getCurrentDate()).toBe("2025-06-15");

		vi.useRealTimers();
	});
});

describe("handleTrailingSlash", () => {
	it("returns URL unchanged when trailingSlash is false", () => {
		expect(handleTrailingSlash("https://example.com/about", false)).toBe("https://example.com/about");
	});

	it("returns URL unchanged when trailingSlash is undefined", () => {
		expect(handleTrailingSlash("https://example.com/about", undefined)).toBe("https://example.com/about");
	});

	it("adds trailing slash when trailingSlash is true", () => {
		expect(handleTrailingSlash("https://example.com/about", true)).toBe("https://example.com/about/");
	});

	it("does not double-add trailing slash if URL already ends with /", () => {
		expect(handleTrailingSlash("https://example.com/about/", true)).toBe("https://example.com/about/");
	});
});
