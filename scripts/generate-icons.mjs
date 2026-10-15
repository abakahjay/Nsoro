// Generates every Nsoro icon and logo image from one design, rendered by headless
// Chrome (so text and gradients look exactly like they do in the browser):
//
//   node scripts/generate-icons.mjs          (CHROME_PATH=... if Chrome isn't found)
//
// The mark: a deep-green tile with a soft light spot, a gold star, and Ghana's black
// star in the middle (Nsoro = "star" in Twi), plus one small sparkle.
//
// public/icons/nsoro-logo.svg      the mark (favicon, in-app logo)
// public/icons/nsoro-wordmark.svg  mark + "Nsoro"
// public/icons/icon-192/512.png    PWA icons, rounded tile (manifest "any")
// public/icons/maskable-512.png    full-bleed, mark inside Android's 80% safe zone
// public/icons/apple-touch-icon.png  180px full-bleed (iOS rounds the corners itself)
// public/icons/favicon-48.png, public/favicon.ico
// public/logo.png                  wordmark on transparent (navbar, sign-in form)
// public/auth.png                  sign-in page artwork
// desktop/build/icon.png           Windows app / installer icon (electron-builder)
// public/icons/tv-banner.png       Android TV home-screen banner (320x180 dp at 2x),
//                                  copied into the Android app as drawable-xhdpi/tv_banner.png
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = (p) => join(root, p);

const GREEN_LIGHT = "#22b866";
const GREEN = "#0a7a4b";
const GREEN_DARK = "#05452b";
const GOLD_LIGHT = "#ffd84a";
const GOLD = "#f2b705";
const GOLD_DARK = "#d18f00";

// Rounded five-point star as an SVG path (points rounded with quadratic curves).
const starPath = (cx, cy, outer, inner, round = 0.18) => {
	const pts = Array.from({ length: 10 }, (_, i) => {
		const r = i % 2 ? inner : outer;
		const a = -Math.PI / 2 + (i * Math.PI) / 5;
		return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
	});
	const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
	let d = "";
	pts.forEach((p, i) => {
		const prev = pts[(i + 9) % 10];
		const next = pts[(i + 1) % 10];
		const a = lerp(p, prev, round);
		const b = lerp(p, next, round);
		d += `${i ? "L" : "M"}${a[0].toFixed(1)},${a[1].toFixed(1)} Q${p[0].toFixed(1)},${p[1].toFixed(1)} ${b[0].toFixed(1)},${b[1].toFixed(1)} `;
	});
	return d + "Z";
};
const sparkle = (cx, cy, r) =>
	`M${cx},${cy - r} Q${cx + r * 0.18},${cy - r * 0.18} ${cx + r},${cy} Q${cx + r * 0.18},${cy + r * 0.18} ${cx},${cy + r} Q${cx - r * 0.18},${cy + r * 0.18} ${cx - r},${cy} Q${cx - r * 0.18},${cy - r * 0.18} ${cx},${cy - r} Z`;

// The mark on a 512 canvas. `tile`: 'rounded' | 'square' (full bleed); `scale` shrinks
// the glyph (maskable icons keep it inside the safe zone).
const markSvg = ({ tile = "rounded", scale = 1 } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="0.3" cy="0.22" r="0.95">
      <stop offset="0" stop-color="${GREEN_LIGHT}"/>
      <stop offset="0.55" stop-color="${GREEN}"/>
      <stop offset="1" stop-color="${GREEN_DARK}"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${GOLD_LIGHT}"/>
      <stop offset="0.6" stop-color="${GOLD}"/>
      <stop offset="1" stop-color="${GOLD_DARK}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${tile === "rounded" ? 142 : 0}" fill="url(#bg)"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <path d="${starPath(256, 280, 178, 84)}" fill="${GREEN_DARK}" opacity="0.35" transform="translate(0 14)"/>
    <path d="${starPath(256, 270, 178, 84)}" fill="url(#gold)"/>
    <path d="${starPath(256, 282, 62, 27, 0.08)}" fill="#141414"/>
    <path d="${sparkle(404, 104, 30)}" fill="${GOLD_LIGHT}"/>
  </g>
</svg>`;

const wordmarkSvg = (h = 64) => {
	const w = Math.round(h * 3.3);
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <image href="data:image/svg+xml;base64,${Buffer.from(markSvg()).toString("base64")}" width="${h}" height="${h}"/>
  <text x="${h * 1.22}" y="${h * 0.73}" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-weight="800" font-size="${h * 0.66}" letter-spacing="-1" fill="#f5f5f5">Nsoro</text>
</svg>`;
};

// ---- render with headless Chrome ----
const chrome =
	process.env.CHROME_PATH ||
	[
		"C:/Program Files/Google/Chrome/Application/chrome.exe",
		"C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
		"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
		"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
		"/usr/bin/google-chrome",
		"/usr/bin/chromium",
	].find((p) => existsSync(p));
if (!chrome) throw new Error("Chrome not found - set CHROME_PATH");

const tmp = mkdtempSync(join(tmpdir(), "nsoro-icons-"));
const render = (html, width, height, file, scale = 1) => {
	const page = join(tmp, "page.html");
	const shot = join(tmp, "shot.png");
	writeFileSync(page, `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:transparent;overflow:hidden}</style></head><body>${html}</body></html>`);
	execFileSync(chrome, [
		"--headless=new",
		"--disable-gpu",
		"--hide-scrollbars",
		"--default-background-color=00000000",
		`--force-device-scale-factor=${scale}`,
		`--window-size=${width},${height}`,
		`--screenshot=${shot}`,
		`file:///${page.replace(/\\/g, "/")}`,
	], { stdio: "ignore" });
	const png = readFileSync(shot);
	writeFileSync(out(file), png);
	console.log(`${file}  ${png.length} bytes`);
	return png;
};
const svgImg = (svg, size) => `<img src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}" width="${size}" height="${size}" style="display:block">`;

// ICO that embeds PNG images (Windows Vista+ and every browser read these).
const ico = (pngs) => {
	const header = Buffer.alloc(6);
	header.writeUInt16LE(1, 2);
	header.writeUInt16LE(pngs.length, 4);
	let offset = 6 + 16 * pngs.length;
	const entries = pngs.map(({ size, png }) => {
		const e = Buffer.alloc(16);
		e[0] = size >= 256 ? 0 : size;
		e[1] = size >= 256 ? 0 : size;
		e.writeUInt16LE(1, 4); // colour planes
		e.writeUInt16LE(32, 6); // bits per pixel
		e.writeUInt32LE(png.length, 8);
		e.writeUInt32LE(offset, 12);
		offset += png.length;
		return e;
	});
	return Buffer.concat([header, ...entries, ...pngs.map((p) => p.png)]);
};

try {
	writeFileSync(out("public/icons/nsoro-logo.svg"), markSvg());
	writeFileSync(out("public/icons/nsoro-wordmark.svg"), wordmarkSvg());
	console.log("public/icons/nsoro-logo.svg, nsoro-wordmark.svg");

	const rounded = markSvg();
	const square = markSvg({ tile: "square" });
	render(svgImg(rounded, 192), 192, 192, "public/icons/icon-192.png");
	render(svgImg(rounded, 512), 512, 512, "public/icons/icon-512.png");
	render(svgImg(markSvg({ tile: "square", scale: 0.72 }), 512), 512, 512, "public/icons/maskable-512.png");
	render(svgImg(square, 180), 180, 180, "public/icons/apple-touch-icon.png");
	render(svgImg(rounded, 512), 512, 512, "desktop/build/icon.png");
	const fav = [16, 32, 48].map((size) => ({ size, png: render(svgImg(rounded, size), size, size, `public/icons/favicon-${size}.png`) }));
	writeFileSync(out("public/favicon.ico"), ico(fav));
	rmSync(out("public/icons/favicon-16.png"));
	rmSync(out("public/icons/favicon-32.png"));
	console.log("public/favicon.ico");

	// Wordmark (navbar, sign-in form): shown ~24px tall, rendered at 2x.
	render(`<div style="padding:8px">${svgImg(rounded, 0).replace('width="0" height="0"', 'width="56" height="56"').replace("display:block", "display:inline-block;vertical-align:middle")}<span style="font:800 44px 'Segoe UI',Helvetica,Arial,sans-serif;letter-spacing:-1px;color:#f5f5f5;vertical-align:middle;margin-left:14px">Nsoro</span></div>`, 250, 72, "public/logo.png", 2);

	// Android TV banner: mark + wordmark on the green tile, edge to edge.
	render(
		`<div style="box-sizing:border-box;width:320px;height:180px;display:flex;align-items:center;justify-content:center;gap:16px;background:radial-gradient(circle at 25% 20%, ${GREEN_LIGHT} 0%, ${GREEN} 50%, ${GREEN_DARK} 100%)">${svgImg(markSvg({ tile: "rounded" }), 88)}<span style="font:800 54px 'Segoe UI',Helvetica,Arial,sans-serif;letter-spacing:-1px;color:#fff">Nsoro</span></div>`,
		320,
		180,
		"public/icons/tv-banner.png",
		2
	);

	// Sign-in page artwork.
	render(
		`<div style="box-sizing:border-box;width:413px;height:604px;border-radius:28px;padding:40px 34px;color:#fff;font-family:'Segoe UI',Helvetica,Arial,sans-serif;background:radial-gradient(circle at 25% 15%, ${GREEN_LIGHT} 0%, ${GREEN} 45%, ${GREEN_DARK} 100%);">
			<div style="display:flex;justify-content:center">${svgImg(rounded, 120)}</div>
			<div style="text-align:center;font-weight:800;font-size:46px;letter-spacing:-1px;margin-top:14px">Nsoro</div>
			<div style="text-align:center;font-size:16px;opacity:.9;margin-top:4px">Share your moments. Shine together.</div>
			<div style="margin-top:38px;display:grid;gap:22px">
				${[
					["Photos &amp; videos", "Post what matters to you"],
					["Moments that glow", "Share a moment for 24 hours"],
					["Chat and call friends", "Messages, voice notes and video calls"],
				]
					.map(([t, s]) => `<div style="display:flex;gap:14px"><div style="width:12px;height:12px;border-radius:50%;background:${GOLD};margin-top:7px;flex-shrink:0"></div><div><div style="font-weight:700;font-size:18px">${t}</div><div style="font-size:14px;opacity:.85;margin-top:2px">${s}</div></div></div>`)
					.join("")}
			</div>
		</div>`,
		413,
		604,
		"public/auth.png",
		2
	);
} finally {
	rmSync(tmp, { recursive: true, force: true });
}
