import { useEffect, useRef, useState } from "react";
import { Avatar, Box, Flex, IconButton, Link, Spinner, Text, VStack } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { PiChatCircleBold, PiShareFatBold, PiStarBold, PiStarFill } from "react-icons/pi";
import { BsVolumeMuteFill, BsVolumeUpFill } from "react-icons/bs";
import API from "../../utils/api";
import { mediaUrl, playVideo } from "../../utils/media";
import { useGetUserById } from "../../hooks/useGetUserById";
import useLikePost from "../../hooks/useLikePost";
import { sharePost } from "../../utils/share";
import { MOBILE_BOTTOM_BAR_H, MOBILE_TOP_BAR_H } from "../../components/NavBar/MobileNav";

// /watch: videos one at a time, full screen, swipe (or scroll) up for the next one.
// Ranked for you by the same feed as Home (FullBackendd GET /api/v1/nsoro/feed?kind=video).
// Sound stays on once you've turned it on, for every video after that.
export default function WatchPage() {
	const [videos, setVideos] = useState(null);
	const [muted, setMuted] = useState(true);

	useEffect(() => {
		let live = true;
		API.get("/api/v1/nsoro/feed", { params: { kind: "video" } })
			.then(({ data }) => live && setVideos(data.posts || []))
			.catch(() => live && setVideos([]));
		return () => {
			live = false;
		};
	}, []);

	// phones: between the top bar and the bottom tab bar; bigger screens: the window
	const height = { base: `calc(100dvh - ${MOBILE_TOP_BAR_H} - ${MOBILE_BOTTOM_BAR_H})`, md: "100dvh" };

	if (videos === null) {
		return (
			<Flex h={height} alignItems='center' justifyContent='center'>
				<Spinner />
			</Flex>
		);
	}
	if (videos.length === 0) {
		return (
			<Flex h={height} alignItems='center' justifyContent='center' direction='column' gap={2} px={6} textAlign='center'>
				<Text fontWeight='bold' fontSize='lg'>No videos yet</Text>
				<Text color='nsoro.secondary'>Post a video and it shows up here for everyone.</Text>
			</Flex>
		);
	}

	return (
		<Box
			h={height}
			overflowY='auto'
			sx={{ scrollSnapType: "y mandatory", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}
			bg='black'
			data-testid='watch-feed'
		>
			{videos.map((post) => (
				<WatchItem key={post._id} post={post} height={height} muted={muted} setMuted={setMuted} />
			))}
		</Box>
	);
}

function WatchItem({ post, height, muted, setMuted }) {
	const ref = useRef(null);
	const { userProfile, profileImageUrl } = useGetUserById(post.createdBy);
	const { isLiked, likes, handleLikePost } = useLikePost(post);

	// Play while it fills most of the screen, pause when swiped away.
	useEffect(() => {
		const video = ref.current;
		if (!video || !("IntersectionObserver" in window)) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					video.currentTime = 0;
					playVideo(video).then((r) => r === "muted" && setMuted(true));
				} else video.pause();
			},
			{ threshold: 0.7 }
		);
		observer.observe(video);
		return () => observer.disconnect();
	}, [setMuted]);

	// Tap the video: pause / play.
	const togglePlay = () => {
		const video = ref.current;
		if (!video) return;
		if (video.paused) playVideo(video);
		else video.pause();
	};

	const username = userProfile?.user?.username || userProfile?.username;
	return (
		<Box position='relative' h={height} sx={{ scrollSnapAlign: "start", scrollSnapStop: "always" }} data-testid='watch-item'>
			<video
				ref={ref}
				src={mediaUrl(post.postId)}
				playsInline
				loop
				muted={muted}
				preload='metadata'
				onClick={togglePlay}
				style={{ width: "100%", height: "100%", objectFit: "cover", background: "black" }}
			/>

			{/* who posted it, and the caption */}
			<Box position='absolute' left={4} right='84px' bottom={5} color='white' textShadow='0 1px 3px rgba(0,0,0,0.8)' pointerEvents='none'>
				{username && (
					<Link as={RouterLink} to={`/${username}`} fontWeight='bold' pointerEvents='auto'>
						@{username}
					</Link>
				)}
				{post.caption && (
					<Text mt={1} fontSize='sm' noOfLines={3}>
						{post.caption}
					</Text>
				)}
			</Box>

			{/* actions down the right side */}
			<VStack position='absolute' right={3} bottom={6} spacing={4} color='white'>
				{username && (
					<Link as={RouterLink} to={`/${username}`} aria-label={`${username}'s profile`}>
						<Avatar size='md' src={profileImageUrl || undefined} name={username} border='2px solid white' referrerPolicy='no-referrer' />
					</Link>
				)}
				<Action label={isLiked ? "Unstar" : "Star"} count={likes} onClick={handleLikePost} icon={isLiked ? <PiStarFill color='#f2b705' /> : <PiStarBold />} />
				<Action as={RouterLink} to={`/p/${post._id}`} label='Comments' count={post.comments?.length || 0} icon={<PiChatCircleBold />} />
				<Action label='Share' onClick={() => sharePost(post, userProfile)} icon={<PiShareFatBold />} />
				<Action label={muted ? "Turn sound on" : "Turn sound off"} onClick={() => setMuted(!muted)} icon={muted ? <BsVolumeMuteFill /> : <BsVolumeUpFill />} />
			</VStack>
		</Box>
	);
}

function Action({ label, count, icon, ...props }) {
	return (
		<Flex direction='column' alignItems='center'>
			<IconButton aria-label={label} icon={icon} variant='unstyled' fontSize='30px' color='white' display='flex' filter='drop-shadow(0 1px 2px rgba(0,0,0,0.7))' {...props} />
			{count !== undefined && (
				<Text fontSize='xs' fontWeight='semibold' textShadow='0 1px 2px rgba(0,0,0,0.8)'>
					{count}
				</Text>
			)}
		</Flex>
	);
}
