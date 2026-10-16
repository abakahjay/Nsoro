// Which installed Nsoro app (if any) is showing this page, and its version, so the
// site can offer "Update" only inside the Android app and only when
// /downloads/version.json lists something newer.
//
// The Android app (2.3.0+) opens the site with ?app_version=<versionCode>
// (LauncherActivity.getLaunchingUrl). Older ones don't, but Chrome gives a TWA the
// referrer android-app://<package>. The Windows app updates itself (desktop/main.js),
// and the website, iPhone/Mac and ChromeOS apps always run the latest site.
export const ANDROID_PACKAGE = "com.instagrammmm.app";
const KEY = "nsoro-android-version";
const OLD_ANDROID_VERSION = 4; // 2.2.0 and older don't report a version

const read = (key) => {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
};
const write = (key, value) => {
	try {
		localStorage.setItem(key, value);
	} catch {
		// private mode: we just won't remember it
	}
};

// Run once at startup (main.jsx), before the router reads the URL.
export function captureAppVersion() {
	if (typeof window === "undefined") return;
	const params = new URLSearchParams(window.location.search);
	const version = params.get("app_version");
	if (version && /^\d{1,6}$/.test(version)) {
		write(KEY, version);
		params.delete("app_version");
		const query = params.toString();
		window.history.replaceState(window.history.state, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
	} else if (document.referrer.startsWith(`android-app://${ANDROID_PACKAGE}`) && !read(KEY)) {
		write(KEY, String(OLD_ANDROID_VERSION));
	}
}

const standalone = () => window.matchMedia?.("(display-mode: standalone)").matches;

// versionCode of the Android app showing this page, or 0 when it's not the app.
// (The app shares Chrome's storage, so also require the app's standalone window:
// the same phone's normal Chrome tabs don't count.)
export const androidAppVersion = () => {
	if (typeof window === "undefined" || !/Android/.test(navigator.userAgent) || !standalone()) return 0;
	return Number(read(KEY)) || 0;
};

// Links that open the app's own screens (UpdateActivity / CallSetupActivity).
const appLink = (host, fallback) =>
	`intent://${host}#Intent;scheme=nsoro;package=${ANDROID_PACKAGE};${fallback ? `S.browser_fallback_url=${encodeURIComponent(fallback)};` : ""}end`;

export const updateLink = (version, apkUrl) =>
	version >= 5 ? appLink("update", apkUrl) : apkUrl; // older apps can't update themselves: download the APK
export const callSetupLink = () => appLink("call-setup");

export const getLatestVersions = () =>
	fetch("/downloads/version.json", { cache: "no-store" })
		.then((res) => (res.ok ? res.json() : null))
		.catch(() => null);

export const remembered = (key) => read(key) === "1";
export const remember = (key) => write(key, "1");
