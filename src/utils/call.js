import { getSocket } from "./socket";
import { getAuthToken } from "./auth";
import useCallStore from "../store/useCallStore";

// Voice and video calls: WebRTC between the two browsers, with the backend's
// socket.io (FullBackendd utils/socket.js, `call:*` events) relaying the invite
// and the offer/answer/ICE candidates.
//   caller: call:invite -> (they accept) call:accepted -> sends the offer
//   callee: call:incoming -> call:accept -> answers the offer
// Either side: call:end / call:decline; the server sends call:ended to both and
// saves a 'call' message to the chat.

// Public STUN works for most home/mobile networks. Calls between strict NATs
// (some campus/office/carrier networks) need a TURN relay: set VITE_TURN_URL
// (comma-separated), VITE_TURN_USERNAME and VITE_TURN_CREDENTIAL.
const iceServers = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
if (import.meta.env.VITE_TURN_URL) {
	iceServers.push({
		urls: import.meta.env.VITE_TURN_URL.split(",").map((u) => u.trim()),
		username: import.meta.env.VITE_TURN_USERNAME,
		credential: import.meta.env.VITE_TURN_CREDENTIAL,
	});
}

let pc = null;
let pendingCandidates = [];
let endTimer = null;

const store = () => useCallStore.getState();
const socket = () => getSocket(getAuthToken());
const newCallId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const plain = (d) => ({ type: d.type, sdp: d.sdp });

const getMedia = (kind) => {
	if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error("Calls need a secure (https) connection."), { name: "Unsupported" });
	return navigator.mediaDevices.getUserMedia({
		audio: { echoCancellation: true, noiseSuppression: true },
		video: kind === "video" ? { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } : false,
	});
};

const mediaError = (error, kind) => {
	const device = kind === "video" ? "camera and microphone" : "microphone";
	if (error.name === "NotAllowedError") return `Allow access to your ${device} to make calls.`;
	if (error.name === "NotFoundError") return `No ${device} found on this device.`;
	if (error.name === "NotReadableError") return `Your ${device} is being used by another app.`;
	return error.message || "Couldn't start the call.";
};

// ---- ringing sounds (WebAudio, so there's no audio file to ship) ----
//   ringback (you're calling): the classic phone-line double ring, "brr-brr",
//            400 + 450 Hz, 0.4 s on, 0.2 s off, 0.4 s on, then 2 s of silence.
//   ring (someone's calling you): an original bright pluck pattern, two quick
//            rising phrases (A5 C#6 E6, then B5 E6 G#6), then a pause.
const NOTE = { A5: 880, B5: 987.77, Cs6: 1108.73, E6: 1318.51, Gs6: 1661.22 };
let tone = null;

// One mallet hit: a sine plus a quiet octave overtone, quick attack, natural decay.
const mallet = (ctx, out, freq, at, length = 0.9, volume = 0.22) => {
	[
		[freq, volume],
		[freq * 2, volume * 0.18],
	].forEach(([f, v]) => {
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "sine";
		osc.frequency.value = f;
		gain.gain.setValueAtTime(0.0001, at);
		gain.gain.exponentialRampToValueAtTime(v, at + 0.012);
		gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
		osc.connect(gain).connect(out);
		osc.start(at);
		osc.stop(at + length + 0.05);
	});
};

// A steady tone burst with short fades so it doesn't click.
const burst = (ctx, out, freqs, at, length, volume, fade = 0.02) => {
	freqs.forEach((f) => {
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "sine";
		osc.frequency.value = f;
		gain.gain.setValueAtTime(0.0001, at);
		gain.gain.linearRampToValueAtTime(volume, at + fade);
		gain.gain.setValueAtTime(volume, at + length - fade);
		gain.gain.linearRampToValueAtTime(0.0001, at + length);
		osc.connect(gain).connect(out);
		osc.start(at);
		osc.stop(at + length + 0.05);
	});
};

const startTone = (type) => {
	stopTone();
	try {
		const ctx = new (window.AudioContext || window.webkitAudioContext)();
		ctx.resume?.().catch(() => {});
		// a gentle low-pass takes the edge off on phone speakers
		const out = ctx.createBiquadFilter();
		out.type = "lowpass";
		out.frequency.value = 3200;
		out.connect(ctx.destination);
		const ring = type === "ring";

		const play = () => {
			const t = ctx.currentTime + 0.05;
			if (ring) {
				[NOTE.A5, NOTE.Cs6, NOTE.E6].forEach((f, i) => mallet(ctx, out, f, t + i * 0.11, 0.45, 0.2));
				[NOTE.B5, NOTE.E6, NOTE.Gs6].forEach((f, i) => mallet(ctx, out, f, t + 0.5 + i * 0.11, i === 2 ? 0.9 : 0.45, 0.2));
				navigator.vibrate?.([500, 300, 500]);
			} else {
				burst(ctx, out, [400, 450], t, 0.4, 0.05);
				burst(ctx, out, [400, 450], t + 0.6, 0.4, 0.05);
			}
		};
		play();
		tone = { ctx, id: setInterval(play, ring ? 2600 : 3000) };
	} catch {
		// no audio output available - the call still works
	}
};
const stopTone = () => {
	if (!tone) return;
	clearInterval(tone.id);
	tone.ctx.close().catch(() => {});
	tone = null;
	navigator.vibrate?.(0);
};

// ---- peer connection ----
const createPeer = (callId, localStream) => {
	pc = new RTCPeerConnection({ iceServers });
	pendingCandidates = [];
	localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
	pc.ontrack = (e) => store().set({ remoteStream: e.streams[0] || new MediaStream([e.track]) });
	pc.onicecandidate = (e) => e.candidate && socket()?.emit("call:signal", { callId, data: { candidate: e.candidate.toJSON() } });
	const onState = () => {
		if (!pc) return;
		const connected = pc.connectionState === "connected" || ["connected", "completed"].includes(pc.iceConnectionState);
		if (connected && store().status === "connecting") store().set({ status: "active", startedAt: Date.now() });
		if (pc.connectionState === "failed" || pc.iceConnectionState === "failed") hangUp("failed");
	};
	pc.onconnectionstatechange = onState;
	pc.oniceconnectionstatechange = onState;
};

const END_TEXT = {
	busy: "On another call",
	"no-answer": "No answer",
	declined: "Call declined",
	failed: "Connection lost",
	missed: "Missed call",
};

// The "Incoming call" notification on this device goes away once the call is
// answered, declined or over.
const clearCallNotification = (callId) => {
	if (!callId || !navigator.serviceWorker?.getRegistration) return;
	navigator.serviceWorker
		.getRegistration()
		.then((reg) => reg?.getNotifications({ tag: `ig-call-${callId}` }))
		.then((list) => list?.forEach((n) => n.close()))
		.catch(() => {});
};

// Set when the app was opened by tapping "Answer" on a call notification
// (/messages/<caller>?answer=<callId>): answer as soon as that call rings here.
let answerWhenRinging = null;
try {
	const params = new URLSearchParams(window.location.search);
	answerWhenRinging = params.get("answer");
	if (answerWhenRinging) {
		params.delete("answer");
		const query = params.toString();
		window.history.replaceState(null, "", window.location.pathname + (query ? `?${query}` : ""));
	}
} catch {
	// no window (tests) - nothing to do
}

// "Answer" tapped while the app was already open in the background.
export const answerFromNotification = (callId) => {
	if (store().status === "incoming" && store().callId === callId) acceptCall();
	else answerWhenRinging = callId;
};

const finish = (reason, message) => {
	const wasRinging = store().status === "incoming";
	clearCallNotification(store().callId);
	stopTone();
	pc?.close();
	pc = null;
	pendingCandidates = [];
	store().localStream?.getTracks().forEach((t) => t.stop());
	if (reason === "answered-elsewhere") return store().reset();
	const key = wasRinging && reason !== "declined" ? "missed" : reason;
	store().set({ status: "ended", endReason: message || END_TEXT[key] || "Call ended", localStream: null, remoteStream: null });
	clearTimeout(endTimer);
	endTimer = setTimeout(() => store().status === "ended" && store().reset(), 1800);
};

// ---- actions (used by the chat header and CallScreen) ----

// Returns an error message to show, or null once it's ringing.
export const startCall = async (peer, kind) => {
	if (!["idle", "ended"].includes(store().status)) return "You're already on a call.";
	const s = socket();
	if (!s?.connected) return "You're offline. Check your connection and try again.";
	let localStream;
	try {
		localStream = await getMedia(kind);
	} catch (error) {
		return mediaError(error, kind);
	}
	clearTimeout(endTimer);
	const callId = newCallId();
	store().reset();
	store().set({ status: "outgoing", callId, kind, peer, localStream });
	startTone("ringback");
	s.timeout(10000).emit("call:invite", { to: peer._id, kind, callId }, (timeoutErr, reply) => {
		if (store().callId !== callId) return;
		if (timeoutErr) return finish("error", "Couldn't reach the server");
		if (reply?.error === "busy") return finish("busy", `${peer.username || "They"} is on another call`);
		if (reply?.error) finish("error", reply.error);
	});
	return null;
};

export const acceptCall = async () => {
	const { callId, kind, status } = store();
	if (status !== "incoming") return null;
	stopTone();
	let localStream;
	try {
		localStream = await getMedia(kind);
	} catch (error) {
		declineCall();
		return mediaError(error, kind);
	}
	if (store().callId !== callId || store().status !== "incoming") {
		localStream.getTracks().forEach((t) => t.stop()); // it ended while we asked for the mic
		return null;
	}
	store().set({ status: "connecting", localStream });
	clearCallNotification(callId);
	createPeer(callId, localStream); // ready before the caller's offer arrives
	socket()
		?.timeout(10000)
		.emit("call:accept", { callId }, (timeoutErr, reply) => {
			if (store().callId !== callId) return;
			if (timeoutErr || reply?.error) finish("error", reply?.error || "Couldn't connect the call");
		});
	return null;
};

export const declineCall = () => {
	const { callId, status } = store();
	if (status !== "incoming") return;
	socket()?.emit("call:decline", { callId });
	finish("declined");
};

export const hangUp = (reason = "hangup") => {
	const { callId, status } = store();
	if (!callId || status === "idle" || status === "ended") return;
	if (status === "incoming") return declineCall();
	socket()?.emit("call:end", { callId });
	finish(reason);
};

export const toggleMute = () => {
	const { localStream, muted } = store();
	localStream?.getAudioTracks().forEach((t) => (t.enabled = muted));
	store().set({ muted: !muted });
};

export const toggleCamera = () => {
	const { localStream, cameraOff } = store();
	localStream?.getVideoTracks().forEach((t) => (t.enabled = cameraOff));
	store().set({ cameraOff: !cameraOff });
};

// ---- socket events (bound once by useCallSync in PageLayout) ----
export const bindCallEvents = (s) => {
	const onIncoming = (invite) => {
		const { status, callId } = store();
		if (callId === invite.callId) return; // re-sent after a reconnect
		if (!["idle", "ended"].includes(status)) return; // the server never rings a user who's on a call
		clearTimeout(endTimer);
		store().reset();
		store().set({ status: "incoming", callId: invite.callId, kind: invite.kind, peer: { ...invite.caller, _id: invite.from } });
		startTone("ring");
		s.emit("call:ringing", { callId: invite.callId }); // caller's screen: "Ringing…"
		if (answerWhenRinging === invite.callId) {
			answerWhenRinging = null;
			acceptCall();
		}
	};

	// Their phone has the call - in the app, or as a notification while it's closed.
	const onRinging = ({ callId }) => {
		if (callId === store().callId && store().status === "outgoing") store().set({ ringing: true });
	};

	const onAccepted = async ({ callId }) => {
		if (callId !== store().callId || store().status !== "outgoing") return;
		stopTone();
		store().set({ status: "connecting" });
		try {
			createPeer(callId, store().localStream);
			await pc.setLocalDescription(await pc.createOffer());
			s.emit("call:signal", { callId, data: { sdp: plain(pc.localDescription) } });
		} catch {
			hangUp("failed");
		}
	};

	const onSignal = async ({ callId, data }) => {
		if (callId !== store().callId || !pc) return;
		try {
			if (data.sdp) {
				await pc.setRemoteDescription(data.sdp);
				if (data.sdp.type === "offer") {
					await pc.setLocalDescription(await pc.createAnswer());
					s.emit("call:signal", { callId, data: { sdp: plain(pc.localDescription) } });
				}
				const queued = pendingCandidates;
				pendingCandidates = [];
				for (const c of queued) await pc.addIceCandidate(c).catch(() => {});
			} else if (data.candidate) {
				if (pc.remoteDescription) await pc.addIceCandidate(data.candidate).catch(() => {});
				else pendingCandidates.push(data.candidate);
			}
		} catch {
			hangUp("failed");
		}
	};

	const onEnded = ({ callId, reason }) => {
		if (callId !== store().callId || ["idle", "ended"].includes(store().status)) return;
		finish(reason === "hangup" ? "hangup" : reason);
	};

	s.on("call:incoming", onIncoming);
	s.on("call:ringing", onRinging);
	s.on("call:accepted", onAccepted);
	s.on("call:signal", onSignal);
	s.on("call:ended", onEnded);
	return () => {
		s.off("call:incoming", onIncoming);
		s.off("call:ringing", onRinging);
		s.off("call:accepted", onAccepted);
		s.off("call:signal", onSignal);
		s.off("call:ended", onEnded);
	};
};
