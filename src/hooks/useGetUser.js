import { useEffect } from "react";
import useProfileStore from "../store/userProfileStore";
import API from "../utils/api";
import useShowToast from "./useShowToast";

// Loads the profile for /:username into the profile store.
// Only ever hands back the profile that matches the URL: when you jump from someone's
// profile to your own (or anywhere else) a slow reply for the previous person is
// cancelled/ignored, so it can't show their profile under your address.
export const useGetUser = (username) => {
	const showToast = useShowToast();
	const { userProfile, isLoading, error, setUserProfile, setLoading, setError } = useProfileStore();

	useEffect(() => {
		if (!username) return;
		let active = true;
		const controller = new AbortController();
		setUserProfile(null);
		setError(null);
		setLoading(true);
		API.patch(`/api/v1/users/${encodeURIComponent(username)}`, null, { signal: controller.signal })
			.then(({ data }) => active && setUserProfile(data))
			.catch((err) => {
				if (!active || err.message === "canceled") return;
				const message = err.response?.data?.error || "User not found";
				setError(message);
				showToast("Error", message, "error");
			})
			.finally(() => active && setLoading(false));
		return () => {
			active = false;
			controller.abort();
		};
	}, [username, setUserProfile, setLoading, setError, showToast]);

	// trimmed: older accounts can have a space saved around the name, which links drop
	const same = (a, b) => (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();
	const matches = !!username && same(userProfile?.user?.username, username);
	return {
		isLoading: isLoading || (!matches && !error),
		error,
		userProfile: matches ? userProfile : null,
	};
};
