import { useEffect, useRef, useState } from "react";
import { Avatar, Box, Flex, IconButton, Text } from "@chakra-ui/react";
import { IoCall, IoMic, IoMicOff, IoVideocam, IoVideocamOff } from "react-icons/io5";
import useCallStore from "../../store/useCallStore";
import useShowToast from "../../hooks/useShowToast";
import { acceptCall, declineCall, hangUp, toggleCamera, toggleMute } from "../../utils/call";
import { avatarUrl } from "../../utils/media";

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// Full-screen voice/video call, on top of whatever page you're on (mounted in
// PageLayout). State lives in useCallStore; utils/call.js does the WebRTC.
export default function CallScreen() {
	const { status, kind, peer, ringing, localStream, remoteStream, muted, cameraOff, startedAt, endReason } = useCallStore();
	const showToast = useShowToast();
	const elapsed = useElapsed(status === "active" ? startedAt : null);

	if (status === "idle") return null;

	const isVideo = kind === "video";
	const showRemoteVideo = isVideo && status === "active" && remoteStream;
	const name = peer?.username || "Unknown";
	const statusText = {
		// "Ringing…" once their phone has it (online, app open or not); "Calling…" while it's offline
		outgoing: ringing ? "Ringing…" : "Calling…",
		incoming: isVideo ? "Incoming video call…" : "Incoming voice call…",
		connecting: "Connecting…",
		active: fmt(elapsed),
		ended: endReason,
	}[status];

	const accept = async () => {
		const error = await acceptCall();
		if (error) showToast("Call", error, "error");
	};

	return (
		<Flex position='fixed' inset={0} zIndex={2000} bg='black' color='white' direction='column' role='dialog' aria-label={`Call with ${name}`}>
			{/* the other person's video, full screen */}
			{showRemoteVideo && <StreamVideo stream={remoteStream} position='absolute' inset={0} w='full' h='full' objectFit='cover' />}
			{/* their audio (also for video calls - the video element stays muted) */}
			{remoteStream && <StreamAudio stream={remoteStream} />}

			{/* my camera: full-screen preview while ringing, then a small picture-in-picture */}
			{isVideo && localStream && !cameraOff && status !== "ended" && (
				<StreamVideo
					stream={localStream}
					muted
					mirror
					position='absolute'
					objectFit='cover'
					{...(showRemoteVideo
						? { top: 4, right: 4, w: { base: "110px", md: "180px" }, h: { base: "160px", md: "240px" }, borderRadius: "xl", zIndex: 2, boxShadow: "lg" }
						: { inset: 0, w: "full", h: "full", opacity: 0.45 })}
				/>
			)}

			<Flex position='relative' zIndex={1} flex={1} direction='column' alignItems='center' justifyContent={showRemoteVideo ? "flex-start" : "center"} gap={3} pt={showRemoteVideo ? 6 : 0} px={6} textAlign='center'>
				{!showRemoteVideo && <Avatar src={avatarUrl(peer)} name={name} referrerPolicy='no-referrer' size='2xl' />}
				<Text fontSize={showRemoteVideo ? "lg" : "2xl"} fontWeight='semibold' textShadow='0 1px 4px rgba(0,0,0,.6)'>
					{name}
				</Text>
				<Text color='whiteAlpha.800' sx={{ fontVariantNumeric: "tabular-nums" }} textShadow='0 1px 4px rgba(0,0,0,.6)'>
					{statusText}
				</Text>
			</Flex>

			<Flex position='relative' zIndex={1} justifyContent='center' gap={{ base: 6, md: 8 }} pb='max(32px, env(safe-area-inset-bottom))' pt={4}>
				{status === "incoming" ? (
					<>
						<RoundButton label='Decline' bg='red.500' icon={<IoCall style={{ transform: "rotate(135deg)" }} />} onClick={declineCall} />
						<RoundButton label='Accept' bg='green.500' icon={isVideo ? <IoVideocam /> : <IoCall />} onClick={accept} />
					</>
				) : status !== "ended" ? (
					<>
						<RoundButton label={muted ? "Unmute" : "Mute"} bg={muted ? "white" : "whiteAlpha.300"} color={muted ? "black" : "white"} icon={muted ? <IoMicOff /> : <IoMic />} onClick={toggleMute} />
						{isVideo && (
							<RoundButton
								label={cameraOff ? "Turn camera on" : "Turn camera off"}
								bg={cameraOff ? "white" : "whiteAlpha.300"}
								color={cameraOff ? "black" : "white"}
								icon={cameraOff ? <IoVideocamOff /> : <IoVideocam />}
								onClick={toggleCamera}
							/>
						)}
						<RoundButton label='End call' bg='red.500' icon={<IoCall style={{ transform: "rotate(135deg)" }} />} onClick={() => hangUp()} />
					</>
				) : null}
			</Flex>
		</Flex>
	);
}

function RoundButton({ label, icon, bg, color = "white", onClick }) {
	return (
		<Flex direction='column' alignItems='center' gap={2}>
			<IconButton aria-label={label} icon={icon} onClick={onClick} w='64px' h='64px' borderRadius='full' fontSize='28px' bg={bg} color={color} _hover={{ bg, filter: "brightness(1.1)" }} _active={{ bg, filter: "brightness(0.9)" }} />
			<Text fontSize='xs' color='whiteAlpha.800'>
				{label}
			</Text>
		</Flex>
	);
}

function StreamVideo({ stream, muted = true, mirror, ...props }) {
	const ref = useRef(null);
	useEffect(() => {
		if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream;
	}, [stream]);
	return <Box as='video' ref={ref} autoPlay playsInline muted={muted} transform={mirror ? "scaleX(-1)" : undefined} bg='black' {...props} />;
}

function StreamAudio({ stream }) {
	const ref = useRef(null);
	useEffect(() => {
		if (!ref.current) return;
		ref.current.srcObject = stream;
		ref.current.play?.().catch(() => {});
	}, [stream]);
	return <audio ref={ref} autoPlay />;
}

const useElapsed = (since) => {
	const [now, setNow] = useState(Date.now());
	useEffect(() => {
		if (!since) return;
		setNow(Date.now());
		const id = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(id);
	}, [since]);
	return since ? Math.max(0, Math.floor((now - since) / 1000)) : 0;
};
