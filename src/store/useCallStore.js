import { create } from "zustand";

// The one voice/video call this tab can be on. Driven by utils/call.js and shown
// by components/Call/CallScreen.jsx (mounted in PageLayout, so it survives
// moving between pages).
// status: idle | outgoing (ringing them) | incoming (ringing us) | connecting | active | ended
const useCallStore = create((set) => ({
	status: "idle",
	callId: null,
	kind: "audio", // 'audio' | 'video'
	peer: null, // the other person: { _id, username, profile_picture_id, profile_picture }
	ringing: false, // outgoing: their device has the call (app open, or the push landed)
	localStream: null,
	remoteStream: null,
	muted: false,
	cameraOff: false,
	startedAt: null, // when the media connected
	endReason: null,
	set: (patch) => set(patch),
	reset: () =>
		set({
			status: "idle",
			callId: null,
			kind: "audio",
			peer: null,
			ringing: false,
			localStream: null,
			remoteStream: null,
			muted: false,
			cameraOff: false,
			startedAt: null,
			endReason: null,
		}),
}));

export default useCallStore;
