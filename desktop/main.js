// Nsoro for Windows: a desktop window around the live site, packaged as
// Nsoro-Setup.exe by electron-builder (see package.json "build").
// The site does all the work, so a new website deploy updates the app too.
const { app, BrowserWindow, shell, session, Menu, screen, dialog, net } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const SITE = "https://nsoro-app.onrender.com";
// desktop_version: the site shows "Windows app 2.3.1" in its menu and footer.
const START_URL = `${SITE}/?source=desktop&desktop_version=${app.getVersion()}`;
// Google sign-in leaves the site and comes back; these hosts stay in the window.
const IN_APP_HOSTS = new Set([new URL(SITE).host, "fullbackendd.onrender.com", "accounts.google.com"]);

// Google blocks sign-in from browsers that announce "Electron", so present the
// plain Chrome user agent this Electron build is based on.
app.userAgentFallback = app.userAgentFallback.replace(/\s(Electron|Nsoro|nsoro-desktop)\/\S+/gi, "");

// One window only: opening the app again focuses it.
if (!app.requestSingleInstanceLock()) app.quit();

let win;
function createWindow() {
	// Fit the screen it opens on: most of a laptop screen, a roomy window on a big
	// monitor, and full screen on a TV or other huge display.
	const area = screen.getPrimaryDisplay().workAreaSize;
	const huge = area.width >= 2400;
	win = new BrowserWindow({
		width: Math.min(Math.round(area.width * 0.9), 1600),
		height: Math.min(Math.round(area.height * 0.9), 1000),
		minWidth: Math.min(380, area.width),
		minHeight: Math.min(560, area.height),
		center: true,
		title: "Nsoro",
		backgroundColor: "#000000",
		icon: path.join(__dirname, "build", "icon.png"),
		autoHideMenuBar: true,
		show: false,
		webPreferences: { contextIsolation: true, sandbox: true },
	});
	win.once("ready-to-show", () => {
		if (huge) win.maximize();
		win.show();
	});
	win.loadURL(START_URL);

	const isInApp = (url) => {
		try {
			return IN_APP_HOSTS.has(new URL(url).host);
		} catch {
			return false;
		}
	};
	// Anything outside the app (portfolio link, shared websites) opens in the normal browser.
	win.webContents.setWindowOpenHandler(({ url }) => {
		if (isInApp(url)) return { action: "allow" };
		shell.openExternal(url);
		return { action: "deny" };
	});
	win.webContents.on("will-navigate", (event, url) => {
		if (!isInApp(url)) {
			event.preventDefault();
			shell.openExternal(url);
		}
	});
	// The site is offline / asleep: show a friendly retry page instead of a blank window.
	win.webContents.on("did-fail-load", (_e, code, _desc, url, isMainFrame) => {
		if (!isMainFrame || code === -3) return; // -3 = navigation aborted (normal)
		win.loadURL(
			"data:text/html," +
				encodeURIComponent(`<body style="background:#000;color:#fff;font-family:Segoe UI,sans-serif;display:grid;place-items:center;height:100vh;margin:0">
<div style="text-align:center"><h2>Can't reach Nsoro</h2><p style="color:#aaa">Check your internet connection.</p>
<button onclick="location.href='${START_URL}'" style="background:#0a7a4b;color:#fff;border:0;border-radius:8px;padding:10px 18px;font-size:15px;cursor:pointer">Try again</button></div></body>`)
		);
	});
}

// ---- in-app update ----
// On start, compare this app's version with /downloads/version.json on the site.
// Only when it lists a newer Windows version: ask, download the new installer
// (progress on the taskbar icon), run it and quit; the one-click installer
// replaces this version and opens the new one.
const VERSION_URL = `${SITE}/downloads/version.json`;
const newer = (a, b) => {
	const x = String(a).split(".").map(Number);
	const y = String(b).split(".").map(Number);
	for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
	return false;
};

async function checkForUpdate() {
	let latest;
	try {
		const res = await net.fetch(VERSION_URL, { cache: "no-store" });
		latest = (await res.json()).windows;
	} catch {
		return; // offline: try next time
	}
	if (!latest?.version || !latest.url || !newer(latest.version, app.getVersion())) return;
	const { response } = await dialog.showMessageBox(win, {
		type: "info",
		buttons: ["Update now", "Later"],
		defaultId: 0,
		cancelId: 1,
		title: "Update available",
		message: `Nsoro ${latest.version} is available`,
		detail: `You have ${app.getVersion()}. The update takes a minute; Nsoro reopens when it's done.`,
	});
	if (response !== 0) return;
	try {
		const file = path.join(app.getPath("temp"), `Nsoro-Setup-${latest.version}.exe`);
		const res = await net.fetch(latest.url); // GitHub redirects to the release file
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const total = Number(res.headers.get("content-length")) || 0;
		const out = fs.createWriteStream(file);
		const reader = res.body.getReader();
		let done = 0;
		for (;;) {
			const { done: finished, value } = await reader.read();
			if (finished) break;
			out.write(Buffer.from(value));
			done += value.length;
			if (total && win) win.setProgressBar(done / total);
		}
		await new Promise((resolve, reject) => out.end((err) => (err ? reject(err) : resolve())));
		if (win) win.setProgressBar(-1);
		spawn(file, [], { detached: true, stdio: "ignore" }).unref();
		app.quit();
	} catch (error) {
		if (win) win.setProgressBar(-1);
		dialog.showMessageBox(win, {
			type: "warning",
			title: "Update failed",
			message: "The update couldn't be downloaded.",
			detail: `Check your connection and reopen Nsoro to try again, or download it from ${SITE}/download.

${error.message}`,
		});
	}
}

app.on("second-instance", () => {
	if (!win) return;
	if (win.isMinimized()) win.restore();
	win.focus();
});

app.whenReady().then(() => {
	Menu.setApplicationMenu(null);
	// Microphone for voice messages, notifications and clipboard - only for our own site.
	session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => {
		const allowed = ["media", "notifications", "clipboard-sanitized-write", "clipboard-read"];
		callback(allowed.includes(permission) && wc.getURL().startsWith(SITE));
	});
	createWindow();
	win.webContents.once("did-finish-load", () => checkForUpdate());
});

app.on("window-all-closed", () => app.quit());
