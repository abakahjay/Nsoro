import { useEffect, useRef, useState } from "react";
import {
	Avatar,
	Box,
	CloseButton,
	Flex,
	IconButton,
	Input,
	Link,
	Menu,
	MenuButton,
	MenuItem,
	MenuList,
	Modal,
	ModalBody,
	ModalCloseButton,
	ModalContent,
	ModalHeader,
	ModalOverlay,
	SimpleGrid,
	Spinner,
	Text,
	useDisclosure,
} from "@chakra-ui/react";
import { ArrowBackIcon, DeleteIcon } from "@chakra-ui/icons";
import { IoCall, IoCallOutline, IoSend, IoVideocam, IoVideocamOutline } from "react-icons/io5";
import { BsCheck2, BsCheck2All, BsClock, BsLockFill, BsMicFill, BsPauseFill, BsPlayFill, BsThreeDots } from "react-icons/bs";
import { Link as RouterLink, useParams } from "react-router-dom";
import useChat from "../../hooks/useChat";
import useVoiceRecorder, { MAX_VOICE_SECONDS } from "../../hooks/useVoiceRecorder";
import useShowToast from "../../hooks/useShowToast";
import { useGetUserById } from "../../hooks/useGetUserById";
import { mediaUrl } from "../../utils/media";
import { startCall } from "../../utils/call";
import { dayLabel, fullDateTime, groupByDay, timeLabel } from "../../utils/chatDates";
import { decryptBlob, securityCode } from "../../utils/e2e";

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const LONG_PRESS_MS = 450;

// /messages/:id - a live conversation with the user whose _id is in the URL.
export default function ChatPage() {
	const { id: otherUserId } = useParams();
	const { userProfile, profileImageUrl } = useGetUserById(otherUserId);
	const { myId, messages, isLoading, encrypted, tickState, isOtherTyping, sendMessage, editMessage, unsendMessage, sendVoice, notifyTyping } = useChat(otherUserId);
	const [draft, setDraft] = useState("");
	const [editing, setEditing] = useState(null); // message being edited
	const [menuFor, setMenuFor] = useState(null);
	const bottomRef = useRef(null);
	const inputRef = useRef(null);
	const showToast = useShowToast();
	const verify = useDisclosure();
	const recorder = useVoiceRecorder({ onAutoStop: ({ blob, duration }) => sendVoice(blob, duration) });

	// "Seen" goes under the newest of my messages they've read
	const lastSeenId = [...messages].reverse().find((m) => m.sender === myId && m.type !== "call" && tickState(m) === "read")?._id;

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ block: "end" });
	}, [messages.length, isOtherTyping, lastSeenId]);

	useEffect(() => {
		if (recorder.error) showToast("Microphone", recorder.error, "error");
	}, [recorder.error, showToast]);

	const handleSubmit = (e) => {
		e.preventDefault();
		if (editing) {
			if (draft.trim() && draft.trim() !== editing.message) editMessage(editing._id, draft);
			setEditing(null);
		} else sendMessage(draft);
		setDraft("");
	};

	const startEdit = (msg) => {
		setEditing(msg);
		setDraft(msg.message);
		setTimeout(() => inputRef.current?.focus(), 0);
	};
	const cancelEdit = () => {
		setEditing(null);
		setDraft("");
	};

	const call = async (kind) => {
		if (!userProfile) return;
		const error = await startCall({ ...userProfile, _id: otherUserId }, kind);
		if (error) showToast("Call", error, "error");
	};

	const finishRecording = async () => {
		const result = await recorder.stop();
		if (result) sendVoice(result.blob, result.duration);
	};

	return (
		<Flex direction='column' h='100dvh' w='full'>
			<Flex alignItems='center' gap={3} px={4} py={3} borderBottom='1px solid' borderColor='nsoro.border'>
				<IconButton as={RouterLink} to='/messages' icon={<ArrowBackIcon />} aria-label='Back to messages' variant='ghost' size='sm' display={{ base: "inline-flex", md: "none" }} />
				<Avatar src={profileImageUrl || undefined} referrerPolicy='no-referrer' name={userProfile?.username} size='sm' />
				{userProfile ? (
					<Link as={RouterLink} to={`/${userProfile.username}`} fontWeight='bold'>
						{userProfile.username}
					</Link>
				) : (
					<Text fontWeight='bold'>…</Text>
				)}
				<Flex ml='auto' gap={1}>
					<IconButton aria-label='Voice call' icon={<IoCallOutline />} variant='ghost' fontSize='24px' borderRadius='full' isDisabled={!userProfile} onClick={() => call("audio")} />
					<IconButton aria-label='Video call' icon={<IoVideocamOutline />} variant='ghost' fontSize='26px' borderRadius='full' isDisabled={!userProfile} onClick={() => call("video")} />
				</Flex>
			</Flex>

			<Box flex={1} overflowY='auto' px={4} py={4}>
				{encrypted && (
					<Flex
						as='button'
						type='button'
						onClick={verify.onOpen}
						mx='auto'
						mb={3}
						maxW='420px'
						gap={2}
						alignItems='flex-start'
						textAlign='left'
						fontSize='xs'
						color='nsoro.secondary'
						bg='whiteAlpha.100'
						border='1px solid'
						borderColor='nsoro.border'
						borderRadius='lg'
						px={3}
						py={2}
						data-testid='e2e-banner'
					>
						<Box as={BsLockFill} mt='2px' flexShrink={0} color='gold.400' />
						<Text>Messages and voice notes are end-to-end encrypted. No one outside this chat, not even Nsoro, can read or listen to them. Tap to verify.</Text>
					</Flex>
				)}
				{isLoading && (
					<Flex justifyContent='center' mt={10}>
						<Spinner />
					</Flex>
				)}
				{!isLoading && messages.length === 0 && (
					<Text textAlign='center' color='gray.400' mt={10}>
						Say hi to {userProfile?.username || "them"} 👋
					</Text>
				)}
				{/* one block per day, each with a sticky "Today" / "Yesterday" / date header */}
				{groupByDay(messages).map((day) => (
					<Box key={day.key}>
						<Flex position='sticky' top='-16px' zIndex={1} justifyContent='center' py={2} pointerEvents='none'>
							<Text fontSize='xs' fontWeight='semibold' color='nsoro.secondary' bg='nsoro.bg' border='1px solid' borderColor='nsoro.border' px={3} py={1} borderRadius='full'>
								{dayLabel(day.date)}
							</Text>
						</Flex>
						{day.items.map((msg) => (
							<MessageRow
								key={msg._id}
								msg={msg}
								mine={msg.sender === myId}
								myId={myId}
								menuOpen={menuFor === msg._id}
								onOpenMenu={() => setMenuFor(msg._id)}
								onCloseMenu={() => setMenuFor(null)}
								onEdit={() => startEdit(msg)}
								onUnsend={() => unsendMessage(msg._id)}
								onCopy={() => navigator.clipboard?.writeText(msg.message).then(() => showToast("Copied", "", "success", 1200))}
								onCallBack={call}
								ticks={msg.sender === myId && !msg.failed && msg.type !== "call" ? tickState(msg) : null}
								seen={msg._id === lastSeenId}
							/>
						))}
					</Box>
				))}
				{isOtherTyping && (
					<Text fontSize='sm' color='gray.400' fontStyle='italic'>
						{userProfile?.username || "They"} is typing…
					</Text>
				)}
				<div ref={bottomRef} />
			</Box>

			{editing && (
				<Flex alignItems='center' px={4} py={2} gap={2} bg='whiteAlpha.100' borderTop='1px solid' borderColor='nsoro.border'>
					<Box flex={1} minW={0}>
						<Text fontSize='xs' color='gold.400' fontWeight='semibold'>
							Editing message
						</Text>
						<Text fontSize='xs' color='gray.400' noOfLines={1}>
							{editing.message}
						</Text>
					</Box>
					<CloseButton size='sm' onClick={cancelEdit} aria-label='Cancel editing' />
				</Flex>
			)}

			{recorder.isRecording ? (
				<Flex alignItems='center' gap={3} px={4} py={3} pb='max(12px, env(safe-area-inset-bottom))' borderTop='1px solid' borderColor='nsoro.border'>
					<IconButton aria-label='Cancel recording' icon={<DeleteIcon />} variant='ghost' borderRadius='full' onClick={recorder.cancel} />
					<Flex flex={1} alignItems='center' gap={2} bg='whiteAlpha.100' borderRadius='full' px={4} h='40px'>
						<Box w='10px' h='10px' borderRadius='full' bg='red.500' sx={{ animation: "pulse 1s ease-in-out infinite", "@keyframes pulse": { "50%": { opacity: 0.3 } } }} />
						<Text fontSize='sm' fontVariantNumeric='tabular-nums'>
							{fmt(recorder.seconds)}
						</Text>
						<Text fontSize='xs' color='gray.500' ml='auto'>
							max {fmt(MAX_VOICE_SECONDS)}
						</Text>
					</Flex>
					<IconButton aria-label='Send voice message' icon={<IoSend />} colorScheme='brand' borderRadius='full' onClick={finishRecording} />
				</Flex>
			) : (
				<Flex as='form' onSubmit={handleSubmit} gap={2} px={4} py={3} pb='max(12px, env(safe-area-inset-bottom))' borderTop='1px solid' borderColor='nsoro.border'>
					<Input
						ref={inputRef}
						placeholder={editing ? "Edit message…" : "Message…"}
						value={draft}
						onChange={(e) => {
							setDraft(e.target.value);
							if (!editing) notifyTyping();
						}}
						borderRadius='full'
						autoFocus
					/>
					{draft.trim() || editing ? (
						<IconButton type='submit' icon={<IoSend />} aria-label={editing ? "Save edit" : "Send"} colorScheme='brand' borderRadius='full' isDisabled={!draft.trim()} />
					) : (
						<IconButton aria-label='Record voice message' icon={<BsMicFill />} borderRadius='full' variant='ghost' fontSize='20px' onClick={recorder.start} />
					)}
				</Flex>
			)}
			<SecurityCodeModal isOpen={verify.isOpen} onClose={verify.onClose} myId={myId} otherUserId={otherUserId} username={userProfile?.username} />
		</Flex>
	);
}

// "Verify security code": both people see the same 60 digits if nobody swapped a key.
function SecurityCodeModal({ isOpen, onClose, myId, otherUserId, username }) {
	const [code, setCode] = useState(undefined);
	useEffect(() => {
		if (!isOpen) return;
		let live = true;
		setCode(undefined);
		securityCode(myId, otherUserId)
			.then((c) => live && setCode(c))
			.catch(() => live && setCode(null));
		return () => {
			live = false;
		};
	}, [isOpen, myId, otherUserId]);

	return (
		<Modal isOpen={isOpen} onClose={onClose} isCentered size='sm'>
			<ModalOverlay />
			<ModalContent bg='nsoro.surface' mx={4}>
				<ModalHeader fontSize='md'>Verify security code</ModalHeader>
				<ModalCloseButton />
				<ModalBody pb={6}>
					{code === undefined ? (
						<Flex justifyContent='center' py={6}>
							<Spinner />
						</Flex>
					) : code ? (
						<>
							<SimpleGrid columns={4} spacing={3} fontFamily='mono' fontSize='lg' textAlign='center' letterSpacing='wider' data-testid='e2e-security-code'>
								{code.map((group, i) => (
									<Text key={i}>{group}</Text>
								))}
							</SimpleGrid>
							<Text fontSize='sm' color='nsoro.secondary' mt={5}>
								Compare these numbers with {username || "them"}, in person or on a call. If they match, your chat is end-to-end encrypted with nobody in between. The code changes when either of you adds a new device.
							</Text>
						</>
					) : (
						<Text fontSize='sm' color='nsoro.secondary'>
							{username || "They"}{" hasn't opened the updated Nsoro yet, so there's no code to compare. New messages will be encrypted once they do."}
						</Text>
					)}
				</ModalBody>
			</ModalContent>
		</Modal>
	);
}

function MessageRow({ msg, mine, myId, menuOpen, onOpenMenu, onCloseMenu, onEdit, onUnsend, onCopy, onCallBack, ticks, seen }) {
	const pressTimer = useRef(null);
	const longPressed = useRef(false);
	const [showSent, setShowSent] = useState(false); // tap a message to see exactly when it was sent
	const isVoice = msg.type === "voice";
	const isCall = msg.type === "call";
	const canAct = mine && !msg.pending && !msg.failed && !isCall;
	const unreadable = msg.e2eState === "nokey" || msg.e2eState === "error";

	// Long-press on phones opens the menu; right-click on computers.
	const pressHandlers = canAct
		? {
				onTouchStart: () => {
					longPressed.current = false;
					pressTimer.current = setTimeout(() => {
						longPressed.current = true;
						onOpenMenu();
					}, LONG_PRESS_MS);
				},
				onTouchEnd: () => clearTimeout(pressTimer.current),
				onTouchMove: () => clearTimeout(pressTimer.current),
				onContextMenu: (e) => {
					e.preventDefault();
					onOpenMenu();
				},
		  }
		: {};

	const toggleSent = (e) => {
		if (longPressed.current || e.target.closest("button")) return; // not after opening the menu or tapping play
		setShowSent((v) => !v);
	};

	return (
		<Box mb={2}>
			<Flex justifyContent={mine ? "flex-end" : "flex-start"} alignItems='center' gap={1} role='group'>
				{canAct && (
					<Menu isOpen={menuOpen} onClose={onCloseMenu} placement='left' isLazy>
						<MenuButton
							as={IconButton}
							aria-label='Message options'
							icon={<BsThreeDots />}
							size='xs'
							variant='ghost'
							borderRadius='full'
							opacity={menuOpen ? 1 : 0}
							_groupHover={{ opacity: 1 }}
							_focusVisible={{ opacity: 1 }}
							onClick={onOpenMenu}
						/>
						<MenuList bg='nsoro.surface' borderColor='nsoro.border' minW='150px'>
							{!isVoice && !unreadable && <MenuItem bg='transparent' onClick={onEdit}>Edit</MenuItem>}
							{!isVoice && !unreadable && <MenuItem bg='transparent' onClick={onCopy}>Copy</MenuItem>}
							<MenuItem bg='transparent' color='red.300' onClick={onUnsend}>
								Unsend
							</MenuItem>
						</MenuList>
					</Menu>
				)}
				<Box
					maxW='75%'
					px={isVoice ? 3 : 4}
					py={2}
					borderRadius='2xl'
					bg={mine ? "brand.600" : "nsoro.raised"}
					color='white'
					opacity={msg.pending ? 0.6 : 1}
					wordBreak='break-word'
					whiteSpace='pre-wrap'
					userSelect={canAct ? "none" : "text"}
					sx={{ WebkitTouchCallout: "none" }}
					title={fullDateTime(msg.timestamp)}
					cursor='pointer'
					onClick={toggleSent}
					{...pressHandlers}
				>
					{isCall ? (
						<CallLog msg={msg} mine={mine} onCallBack={onCallBack} />
					) : isVoice ? (
						<VoiceNote msg={msg} myId={myId} />
					) : unreadable ? (
						<Unreadable state={msg.e2eState} />
					) : (
						msg.message
					)}
					<Flex fontSize='10px' mt={1} justifyContent='flex-end' alignItems='center' gap={1} color={msg.failed ? "red.200" : "whiteAlpha.700"}>
						<Text>{msg.failed ? "Not sent" : `${msg.editedAt ? "Edited · " : ""}${timeLabel(msg.timestamp)}`}</Text>
						{ticks && <Ticks state={ticks} />}
					</Flex>
				</Box>
			</Flex>
			{seen && !showSent && (
				<Text fontSize='11px' color='nsoro.secondary' textAlign='right' mt={1} px={1}>
					Seen
				</Text>
			)}
			{showSent && (
				<Text fontSize='11px' color='nsoro.secondary' textAlign={mine ? "right" : "left"} mt={1} px={1}>
					{mine ? "Sent" : "Received"} {fullDateTime(msg.timestamp)}
					{msg.editedAt ? ` · edited ${fullDateTime(msg.editedAt)}` : ""}
				</Text>
			)}
		</Box>
	);
}

// WhatsApp-style receipts on my messages.
const TICKS = {
	pending: { icon: BsClock, color: "whiteAlpha.700", label: "Sending" },
	sent: { icon: BsCheck2, color: "whiteAlpha.700", label: "Sent" },
	delivered: { icon: BsCheck2All, color: "whiteAlpha.700", label: "Delivered" },
	read: { icon: BsCheck2All, color: "#7cd4ff", label: "Read" }, // sky blue: stands out on the green bubble
};
function Ticks({ state }) {
	const { icon: Icon, color, label } = TICKS[state];
	return (
		<Box as='span' color={color} fontSize={state === "pending" ? "10px" : "15px"} lineHeight={0} aria-label={label} title={label}>
			<Icon />
		</Box>
	);
}

// A call in the chat history: "Video call · 2:31" / "Missed voice call".
// The button starts the same kind of call again.
function CallLog({ msg, mine, onCallBack }) {
	const video = msg.callKind === "video";
	const label = video ? "Video call" : "Voice call";
	// "Missed" only for calls nobody answered - not ones you declined yourself
	const missed = msg.callStatus === "missed";
	const title = missed && !mine ? `Missed ${label.toLowerCase()}` : label;
	const detail =
		msg.callStatus === "completed" ? fmt(msg.duration || 0) : msg.callStatus === "declined" ? (mine ? "Declined" : "You declined") : mine ? "No answer" : "Call back";
	const Icon = video ? IoVideocam : IoCall;

	return (
		<Flex alignItems='center' gap={3} minW='180px'>
			<Flex w='36px' h='36px' borderRadius='full' bg={missed && !mine ? "red.500" : "whiteAlpha.300"} alignItems='center' justifyContent='center' flexShrink={0}>
				<Icon />
			</Flex>
			<Box flex={1} minW={0}>
				<Text fontWeight='semibold' fontSize='sm'>
					{title}
				</Text>
				<Text fontSize='xs' color='whiteAlpha.800'>
					{detail}
				</Text>
			</Box>
			<IconButton aria-label={`Call back (${label.toLowerCase()})`} icon={<Icon />} size='sm' borderRadius='full' variant='ghost' color='white' onClick={() => onCallBack(video ? "video" : "audio")} />
		</Flex>
	);
}

// An encrypted message this device has no key for.
function Unreadable({ state }) {
	return (
		<Flex as='span' alignItems='center' gap={2} fontStyle='italic' color='whiteAlpha.800'>
			<BsLockFill />
			{state === "nokey" ? "Sent before this device was set up, so it can't be read here." : "This message couldn't be decrypted."}
		</Flex>
	);
}

// Plain voice notes stream from the server; encrypted ones are downloaded and
// decrypted on this device first (our own just-sent ones play from the recording).
const useVoiceSrc = (msg, myId) => {
	const [src, setSrc] = useState(msg.localUrl || null);
	const [failed, setFailed] = useState(false);
	useEffect(() => {
		if (!msg.audioFileId || msg.localUrl) return;
		if (!msg.e2e) {
			setSrc(mediaUrl(msg.audioFileId));
			return;
		}
		let live = true;
		let url = null;
		decryptBlob(msg.e2e, mediaUrl(msg.audioFileId), myId)
			.then((blob) => {
				url = URL.createObjectURL(blob);
				if (live) setSrc(url);
			})
			.catch(() => live && setFailed(true));
		return () => {
			live = false;
			if (url) URL.revokeObjectURL(url);
		};
	}, [msg.audioFileId, msg.e2e, msg.localUrl, myId]);
	return { src, failed };
};

function VoiceNote({ msg, myId }) {
	const audioRef = useRef(null);
	const [playing, setPlaying] = useState(false);
	const [progress, setProgress] = useState(0);
	const duration = msg.duration || 0;
	const { src, failed } = useVoiceSrc(msg, myId);
	if (failed) return <Unreadable state='error' />;

	const toggle = () => {
		const a = audioRef.current;
		if (!a) return;
		if (a.paused) a.play().catch(() => {});
		else a.pause();
	};

	return (
		<Flex alignItems='center' gap={2} minW='190px'>
			{src && (
				<audio
					ref={audioRef}
					src={src}
					preload='metadata'
					onPlay={() => setPlaying(true)}
					onPause={() => setPlaying(false)}
					onEnded={() => {
						setPlaying(false);
						setProgress(0);
					}}
					onTimeUpdate={(e) => setProgress(duration ? Math.min(e.target.currentTime / duration, 1) : 0)}
				/>
			)}
			<IconButton
				aria-label={playing ? "Pause voice message" : "Play voice message"}
				icon={msg.pending ? <Spinner size='xs' /> : playing ? <BsPauseFill /> : <BsPlayFill />}
				size='sm'
				borderRadius='full'
				bg='whiteAlpha.300'
				_hover={{ bg: "whiteAlpha.400" }}
				color='white'
				onClick={toggle}
				isDisabled={!src}
			/>
			<Box flex={1} h='3px' bg='whiteAlpha.400' borderRadius='full' overflow='hidden'>
				<Box h='full' w={`${progress * 100}%`} bg='white' />
			</Box>
			<Text fontSize='xs' fontVariantNumeric='tabular-nums'>
				{fmt(duration)}
			</Text>
		</Flex>
	);
}
