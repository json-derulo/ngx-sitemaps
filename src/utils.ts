export function getCurrentDate(): string {
	// en-CA uses the YYYY-MM-DD format which the sitemap expects
	return new Intl.DateTimeFormat("en-CA").format(new Date());
}

export function handleTrailingSlash(url: string, hasTrailingSlash: boolean | undefined): string {
	if (!hasTrailingSlash || url.endsWith("/")) {
		return url;
	}
	return url + "/";
}
