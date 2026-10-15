import { useEffect } from "react";
import { getAuthToken } from "../utils/auth";
import { getSocket } from "../utils/socket";
import { bindCallEvents, hangUp } from "../utils/call";

// Mount once while signed in (PageLayout): listens for incoming calls and the
// other side's answer/hang-up on the shared socket. Signing out ends any call.
export const useCallSync = (enabled) => {
	const token = getAuthToken();

	useEffect(() => {
		if (!enabled || !token) return;
		const socket = getSocket(token);
		if (!socket) return;
		const unbind = bindCallEvents(socket);
		const onUnload = () => hangUp();
		window.addEventListener("pagehide", onUnload);
		return () => {
			unbind();
			window.removeEventListener("pagehide", onUnload);
			hangUp();
		};
	}, [enabled, token]);
};
