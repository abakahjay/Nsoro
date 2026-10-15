import { useEffect } from "react";
import { getAuthToken } from "../utils/auth";
import { getSocket } from "../utils/socket";
import { answerFromNotification, bindCallEvents, hangUp } from "../utils/call";

// Mount once while signed in (PageLayout): listens for incoming calls and the
// other side's answer/hang-up on the shared socket, and for "Answer" taps on the
// call notification (from the service worker). Signing out ends any call.
export const useCallSync = (enabled) => {
	const token = getAuthToken();

	useEffect(() => {
		if (!enabled || !token) return;
		const socket = getSocket(token);
		if (!socket) return;
		const unbind = bindCallEvents(socket);
		const onUnload = () => hangUp();
		window.addEventListener("pagehide", onUnload);
		// "Answer" on the call notification while this tab was in the background
		const onWorkerMessage = (e) => e.data?.type === "call-answer" && answerFromNotification(e.data.callId);
		navigator.serviceWorker?.addEventListener("message", onWorkerMessage);
		return () => {
			unbind();
			window.removeEventListener("pagehide", onUnload);
			navigator.serviceWorker?.removeEventListener("message", onWorkerMessage);
			hangUp();
		};
	}, [enabled, token]);
};
