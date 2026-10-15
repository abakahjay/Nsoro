const apiUrl = import.meta.env.VITE_API_URL;

// Direct URLs to GridFS files on the backend. The browser streams and caches
// these itself, so there's no need for fetchImage's blob/object-URL round trip.
export const imageUrl = (fileId) => (fileId ? `${apiUrl}/api/v1/posts/image/${fileId}` : undefined);

// /media/ supports HTTP Range requests, which <video> needs for seeking.
export const mediaUrl = (fileId) => (fileId ? `${apiUrl}/api/v1/posts/media/${fileId}` : undefined);

export const isVideoPost = (post) => post?.mediaType === "video";

// A user's avatar: their uploaded picture (GridFS) if they have one, otherwise the
// photo URL Google sign-in stored in `profile_picture`. The schema default
// './placeholder.jpg' isn't a real file, so it falls through to Chakra's initials.
export const avatarUrl = (user) => {
	if (user?.profile_picture_id) return imageUrl(user.profile_picture_id);
	if (/^https?:\/\//.test(user?.profile_picture || "")) return user.profile_picture;
	return undefined;
};

// Starts a video, with sound if allowed. Phones (Android Chrome, the installed app,
// iOS) refuse to start a video WITH sound unless the user just tapped - e.g. the next
// reel after you've unmuted. Instead of leaving it frozen, play it muted and resolve
// "muted" so the caller can show the unmute button again.
export const playVideo = async (video) => {
	if (!video) return "failed";
	try {
		await video.play();
		return "played";
	} catch (error) {
		if (error?.name !== "NotAllowedError" || video.muted) return "failed";
		video.muted = true;
		try {
			await video.play();
			return "muted";
		} catch {
			return "failed";
		}
	}
};
