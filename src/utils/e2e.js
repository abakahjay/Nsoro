// End-to-end encrypted messages (WebCrypto only, nothing to install).
//
// Every device gets its own ECDH P-256 key pair. The private key is created
// non-extractable and kept in this browser's IndexedDB, so it never leaves the
// device. The public key is registered with FullBackendd (PUT /api/v1/messages/keys).
//
// Sending: a fresh AES-256-GCM key encrypts the text (or the voice note's audio).
// That key is then wrapped once for every device of the recipient and of the
// sender (so your other devices can read what you sent): AES-KW with a key from
// HKDF(ECDH(my device key, their device key)). The server stores the envelope
// { v, sd, spk, iv, ct, keys: [{ d, k }] } and can't read any of it.
//
// A device can only read messages sent after it was set up (like Signal/WhatsApp
// on a new phone). Older, unencrypted messages still show as they are.
import API from "./api";
import { getAuthToken } from "./auth";

const DB = "nsoro-e2e";
const STORE = "devices";
const INFO = new TextEncoder().encode("nsoro-e2e-v1");
const ECDH = { name: "ECDH", namedCurve: "P-256" };

export const e2eSupported = () => typeof window !== "undefined" && !!window.crypto?.subtle && !!window.indexedDB;

const auth = () => ({ Authorization: `Bearer ${getAuthToken()}` });

const toB64 = (buf) => {
	const bytes = new Uint8Array(buf);
	let s = "";
	for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	return btoa(s);
};
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

// ---- this device's key pair, per signed-in account ----
const openDb = () =>
	new Promise((resolve, reject) => {
		const req = indexedDB.open(DB, 1);
		req.onupgradeneeded = () => req.result.createObjectStore(STORE);
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
const dbGet = async (key) => {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const req = db.transaction(STORE).objectStore(STORE).get(key);
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
};
const dbPut = async (key, value) => {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, "readwrite");
		tx.objectStore(STORE).put(value, key);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
};

const devices = new Map(); // userId -> Promise<{ deviceId, privateKey, publicKey, publicB64 }>

const loadOrCreate = async (userId) => {
	let saved = await dbGet(userId);
	if (!saved) {
		const pair = await crypto.subtle.generateKey(ECDH, false, ["deriveBits"]);
		const deviceId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
		saved = { deviceId, privateKey: pair.privateKey, publicKey: pair.publicKey };
		await dbPut(userId, saved);
	}
	const publicB64 = toB64(await crypto.subtle.exportKey("raw", saved.publicKey));
	await API.put("/api/v1/messages/keys", { deviceId: saved.deviceId, publicKey: publicB64 }, { headers: auth() });
	return { ...saved, publicB64 };
};

// Sets up (once per session) and registers this device for `userId`.
export const ensureDevice = (userId) => {
	if (!userId || !e2eSupported()) return Promise.resolve(null);
	if (!devices.has(userId)) {
		const p = loadOrCreate(userId).catch((error) => {
			devices.delete(userId); // try again next time
			throw error;
		});
		devices.set(userId, p);
	}
	return devices.get(userId);
};

// ---- other people's device keys ----
const keyCache = new Map(); // userId -> { at, promise }
const KEY_TTL = 15 * 1000; // short, so a new device of theirs is picked up quickly

export const getDeviceKeys = (userId, { fresh = false } = {}) => {
	const hit = keyCache.get(userId);
	if (!fresh && hit && Date.now() - hit.at < KEY_TTL) return hit.promise;
	const promise = API.get(`/api/v1/messages/keys/${userId}`, { headers: auth() })
		.then(({ data }) => data.devices || [])
		.catch((error) => {
			keyCache.delete(userId);
			throw error;
		});
	keyCache.set(userId, { at: Date.now(), promise });
	return promise;
};

const importPublic = (b64) => crypto.subtle.importKey("raw", fromB64(b64), ECDH, false, []);

const wrappingKey = async (privateKey, publicKey, iv, deviceId) => {
	const bits = await crypto.subtle.deriveBits({ name: "ECDH", public: publicKey }, privateKey, 256);
	const hkdf = await crypto.subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
	const info = new Uint8Array([...INFO, ...new TextEncoder().encode(`|${deviceId}`)]);
	return crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: iv, info }, hkdf, { name: "AES-KW", length: 256 }, false, [
		"wrapKey",
		"unwrapKey",
	]);
};

// Encrypts bytes for everyone in a one-to-one chat. Returns { envelope, cipher }
// or null when the recipient hasn't set up encryption yet (an older app version).
const seal = async (bytes, myId, otherId) => {
	const me = await ensureDevice(myId);
	if (!me) return null;
	const [theirs, mine] = await Promise.all([getDeviceKeys(otherId), getDeviceKeys(myId)]);
	if (!theirs.length) return null;
	const targets = new Map();
	[...theirs, ...mine, { deviceId: me.deviceId, publicKey: me.publicB64 }].forEach((d) => targets.set(d.deviceId, d.publicKey));

	const contentKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, contentKey, bytes);
	const keys = [];
	for (const [deviceId, publicKey] of targets) {
		try {
			const wrap = await wrappingKey(me.privateKey, await importPublic(publicKey), iv, deviceId);
			keys.push({ d: deviceId, k: toB64(await crypto.subtle.wrapKey("raw", contentKey, wrap, "AES-KW")) });
		} catch {
			// a malformed key on the server: skip that device
		}
	}
	return { envelope: { v: 1, sd: me.deviceId, spk: me.publicB64, iv: toB64(iv), keys }, cipher };
};

const open = async (envelope, cipherBytes, myId) => {
	const me = await ensureDevice(myId);
	if (!me) throw new Error("unsupported");
	const mine = envelope.keys?.find((k) => k.d === me.deviceId);
	if (!mine) {
		const error = new Error("nokey");
		error.code = "nokey";
		throw error;
	}
	const iv = fromB64(envelope.iv);
	const unwrap = await wrappingKey(me.privateKey, await importPublic(envelope.spk), iv, me.deviceId);
	const contentKey = await crypto.subtle.unwrapKey("raw", fromB64(mine.k), unwrap, "AES-KW", "AES-GCM", false, ["decrypt"]);
	return crypto.subtle.decrypt({ name: "AES-GCM", iv }, contentKey, cipherBytes);
};

// ---- text messages ----
export const encryptText = async (text, myId, otherId) => {
	const sealed = await seal(new TextEncoder().encode(text), myId, otherId);
	if (!sealed) return null;
	return { ...sealed.envelope, ct: toB64(sealed.cipher) };
};

// Decrypted copies, keyed by message id + edit time, so re-renders and inbox
// refreshes don't decrypt the same message again.
const plainCache = new Map();

// Returns the message with readable `message` text and an `e2eState`:
// undefined (never encrypted), "ok", "nokey" (sent before this device was set up)
// or "error".
export const decryptMessage = async (msg, myId) => {
	if (!msg?.e2e || msg.type === "voice") return msg.e2e ? { ...msg, e2eState: "ok" } : msg;
	const cacheKey = `${msg._id}|${msg.editedAt || ""}`;
	if (plainCache.has(cacheKey)) return { ...msg, message: plainCache.get(cacheKey), e2eState: "ok" };
	try {
		const plain = new TextDecoder().decode(await open(msg.e2e, fromB64(msg.e2e.ct), myId));
		plainCache.set(cacheKey, plain);
		return { ...msg, message: plain, e2eState: "ok" };
	} catch (error) {
		return { ...msg, message: "", e2eState: error.code === "nokey" ? "nokey" : "error" };
	}
};

export const decryptAll = (list, myId) => Promise.all((list || []).map((m) => decryptMessage(m, myId)));

// ---- voice notes: the uploaded file itself is encrypted ----
export const encryptBlob = async (blob, myId, otherId) => {
	const sealed = await seal(await blob.arrayBuffer(), myId, otherId);
	if (!sealed) return null;
	return { envelope: { ...sealed.envelope, mime: blob.type || "audio/webm" }, blob: new Blob([sealed.cipher], { type: blob.type || "audio/webm" }) };
};

export const decryptBlob = async (envelope, url, myId) => {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const plain = await open(envelope, await res.arrayBuffer(), myId);
	return new Blob([plain], { type: envelope.mime || "audio/webm" });
};

// ---- security code (compare it with the other person to rule out a fake key) ----
// 60 digits from a SHA-256 over both people's device keys, the same on both phones.
export const securityCode = async (myId, otherId) => {
	await ensureDevice(myId);
	const [mine, theirs] = await Promise.all([getDeviceKeys(myId, { fresh: true }), getDeviceKeys(otherId, { fresh: true })]);
	if (!theirs.length) return null;
	const side = (id, list) => `${id}:${list.map((d) => d.publicKey).sort().join(",")}`;
	const text = [side(myId, mine), side(otherId, theirs)].sort().join("|");
	const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
	let digits = "";
	for (let i = 0; digits.length < 60; i = (i + 2) % hash.length) {
		digits += String(((hash[i] << 8) | hash[i + 1]) % 100000).padStart(5, "0");
		if (i + 2 >= hash.length) break;
	}
	return digits.slice(0, 60).match(/.{5}/g);
};
