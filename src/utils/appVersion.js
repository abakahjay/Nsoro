// Which installed Nsoro app (if any) is showing this page, and its version, so the
// site can offer "Update" only inside the Android app and only when
// /downloads/version.json lists something newer.
//
// The Android app (2.3.0+) opens the site with ?app_version=<versionCode>
// (LauncherActivity.getLaunchingUrl). The Windows app updates itself (desktop/main.js),
// and the website, iPhone/Mac and ChromeOS apps always run the latest site.
export const ANDROID_PACKAGE = "com.nsoro.app";
const KEY = "nsoro-android-version";
// Set for this visit when the app opened us. Apps from before 3.0.0 had another package
// id, so Chrome shows them in a normal browser window (not "standalone"); this still
// lets them see the update card that installs the new app.
const SESSION_KEY = "nsoro-android-session";
// "missing" | "ok": whether the app still lacks something calls need (3.0.4+ sends it)
const SETUP_KEY = "nsoro-call-setup-status";

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
		try {
			sessionStorage.setItem(SESSION_KEY, "1");
		} catch {
			// private mode
		}
		params.delete("app_version");
		const setup = params.get("call_setup");
		if (setup === "missing" || setup === "ok") write(SETUP_KEY, setup);
		params.delete("call_setup");
		const query = params.toString();
		window.history.replaceState(window.history.state, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
	}
}

const openedByApp = () => {
	try {
		return sessionStorage.getItem(SESSION_KEY) === "1";
	} catch {
		return false;
	}
};

const standalone = () => window.matchMedia?.("(display-mode: standalone)").matches;

// versionCode of the Android app showing this page, or 0 when it's not the app.
// (The app shares Chrome's storage, so also require the app's standalone window, or
// this visit having been opened by the app: the same phone's normal Chrome tabs don't count.)
export const androidAppVersion = () => {
	if (typeof window === "undefined" || !/Android/.test(navigator.userAgent) || !(standalone() || openedByApp())) return 0;
	return Number(read(KEY)) || 0;
};

// Links that open the app's own screens (UpdateActivity / CallSetupActivity).
const appLink = (host, fallback) =>
	`intent://${host}#Intent;scheme=nsoro;package=${ANDROID_PACKAGE};${fallback ? `S.browser_fallback_url=${encodeURIComponent(fallback)};` : ""}end`;

// 3.0.0 is a new app (new package id), so apps older than that download its APK
// (the link falls back to it when the new app isn't installed yet).
export const updateLink = (version, apkUrl) => (version >= 7 ? appLink("update", apkUrl) : apkUrl);
export const callSetupLink = () => appLink("call-setup");

export const getLatestVersions = () =>
	fetch("/downloads/version.json", { cache: "no-store" })
		.then((res) => (res.ok ? res.json() : null))
		.catch(() => null);

// The app's last report; null when it never said (older app, or not opened by the app yet).
export const callSetupStatus = () => read(SETUP_KEY);

export const readTime = (key) => Number(read(key)) || 0;
export const writeTime = (key) => write(key, String(Date.now()));

export const remembered = (key) => read(key) === "1";
export const remember = (key) => write(key, "1");
