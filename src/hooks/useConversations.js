import { useCallback, useEffect, useState } from "react";
import API from "../utils/api";
import { getAuthToken, getAuthUserId } from "../utils/auth";
import { decryptMessage } from "../utils/e2e";
import useAuthStore from "../store/useAuthStore";
import { getSocket } from "../utils/socket";
import useShowToast from "./useShowToast";

// The signed-in user's inbox: [{ user, lastMessage, unread }], newest first.
// Refreshes whenever a message arrives over the socket. Encrypted previews are
// decrypted here on the device (utils/e2e.js).
// `activeId`: the chat that's open right now - it shows as read straight away,
// without waiting for the server's mark-read round trip.
const useConversations = (activeId) => {
	const [conversations, setConversations] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const showToast = useShowToast();
	const token = getAuthToken();
	const myId = getAuthUserId(useAuthStore((state) => state.user));

	const load = useCallback(
		async (signal) => {
			try {
				const { data } = await API.get("/api/v1/messages/conversations", {
					signal,
					headers: { Authorization: `Bearer ${token}` },
				});
				const rows = await Promise.all(
					data.conversations.map(async (c) => ({ ...c, lastMessage: await decryptMessage(c.lastMessage, myId) }))
				);
				setConversations(rows);
			} catch (error) {
				if (error.message === "canceled") return;
				showToast("Error", error.response?.data?.error || error.message, "error");
			} finally {
				setIsLoading(false);
			}
		},
		[token, myId, showToast]
	);

	useEffect(() => {
		const controller = new AbortController();
		load(controller.signal);

		const socket = getSocket(token);
		const refresh = () => load();
		// new, edited and unsent messages all change the inbox preview
		socket?.on("receiveMessage", refresh);
		socket?.on("messageUpdated", refresh);
		socket?.on("messageDeleted", refresh);
		window.addEventListener("inbox:refresh", refresh); // a chat was marked read
		return () => {
			controller.abort();
			socket?.off("receiveMessage", refresh);
			socket?.off("messageUpdated", refresh);
			socket?.off("messageDeleted", refresh);
			window.removeEventListener("inbox:refresh", refresh);
		};
	}, [load, token]);

	const shown = activeId ? conversations.map((c) => (c.user._id === activeId && c.unread ? { ...c, unread: 0 } : c)) : conversations;
	return { conversations: shown, isLoading };
};

export default useConversations;
