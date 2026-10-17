import { useEffect, useRef, useState } from "react";
import { Box, Image } from "@chakra-ui/react";
import { BsPlayFill, BsVolumeMuteFill, BsVolumeUpFill } from "react-icons/bs";
import { imageUrl, isVideoPost, mediaUrl, playVideo } from "../../utils/media";

// Renders a post's image or video.
//   variant="feed"  - full width (tall photos cropped to 4:5 portrait, like other photo
//                     apps); videos autoplay muted while on screen, with a mute button
//   variant="thumb" - square grid tile; videos show their first frame + play badge
//   variant="full"  - post modal; videos play with sound controls
export default function PostMedia({ post, variant = "feed" }) {
	// Posts uploaded before the backend recorded mediaType default to 'image' even when
	// the file is a video - if the <img> can't decode it, fall back to the video player.
	const [imageFailed, setImageFailed] = useState(false);
	if (!post?.postId) return null;

	if (!isVideoPost(post) && !imageFailed) {
		// feed: always full post width (small uploads included); full: fit inside the modal
		const fit =
			variant === "thumb"
				? { w: "100%", h: "100%", objectFit: "cover" }
				: variant === "feed"
				? { w: "100%", maxH: "min(125vw, 700px)", objectFit: "cover" }
				: { maxH: "85vh", objectFit: "contain" };
		return (
			<Image
				src={imageUrl(post.postId)}
				alt={post.caption || "Post"}
				loading='lazy'
				onError={() => setImageFailed(true)}
				{...fit}
			/>
		);
	}

	if (variant === "thumb") {
		return (
			<Box position='relative' w='100%' h='100%'>
				{/* #t=0.1 makes browsers paint the first frame instead of a black box */}
				<video
					src={`${mediaUrl(post.postId)}#t=0.1`}
					preload='metadata'
					muted
					playsInline
					style={{ width: "100%", height: "100%", objectFit: "cover" }}
				/>
				<Box position='absolute' top={2} right={2} color='white' filter='drop-shadow(0 0 2px black)'>
					<BsPlayFill size={24} />
				</Box>
			</Box>
		);
	}

	return <PostVideo src={mediaUrl(post.postId)} autoPlayInView={variant === "feed"} />;
}

function PostVideo({ src, autoPlayInView }) {
	const ref = useRef(null);
	const [muted, setMuted] = useState(true);

	// Play (muted) when mostly visible, pause when scrolled away.
	useEffect(() => {
		const video = ref.current;
		if (!autoPlayInView || !video || !("IntersectionObserver" in window)) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				// if you unmuted it, coming back to it must not leave it frozen (see playVideo)
				if (entry.isIntersecting) playVideo(video).then((r) => r === "muted" && setMuted(true));
				else video.pause();
			},
			{ threshold: 0.6 }
		);
		observer.observe(video);
		return () => observer.disconnect();
	}, [autoPlayInView]);

	if (!autoPlayInView) {
		return <video ref={ref} src={src} controls playsInline autoPlay preload='metadata' style={{ width: "100%", maxHeight: "80vh", background: "black" }} />;
	}

	// Feed: no player controls, just a sound button, like other short-video apps.
	const toggleSound = (e) => {
		e.stopPropagation(); // not a tap on the post (double-tap stars)
		const video = ref.current;
		if (!video) return;
		video.muted = !video.muted;
		setMuted(video.muted);
		if (video.paused) playVideo(video);
	};
	return (
		<Box position='relative'>
			<video ref={ref} src={src} playsInline loop muted={muted} preload='metadata' style={{ width: "100%", maxHeight: "min(125vw, 700px)", objectFit: "cover", background: "black", display: "block" }} />
			<Box
				as='button'
				type='button'
				aria-label={muted ? "Turn sound on" : "Turn sound off"}
				onClick={toggleSound}
				position='absolute'
				right={3}
				bottom={3}
				w='34px'
				h='34px'
				borderRadius='full'
				bg='blackAlpha.700'
				color='white'
				display='flex'
				alignItems='center'
				justifyContent='center'
				data-testid='video-sound'
			>
				{muted ? <BsVolumeMuteFill size={18} /> : <BsVolumeUpFill size={18} />}
			</Box>
		</Box>
	);
}
