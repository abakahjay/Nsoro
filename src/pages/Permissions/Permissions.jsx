import { useCallback, useEffect, useState } from "react";
import { Badge, Box, Button, Flex, Heading, Text, VStack } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { PiBellRingingBold, PiCameraBold, PiMicrophoneBold, PiPhoneCallBold } from "react-icons/pi";
import { enablePush, getPushState } from "../../utils/push";
import { androidAppVersion, callSetupLink, callSetupStatus } from "../../utils/appVersion";
import { detectDevice } from "../../utils/install";
import useShowToast from "../../hooks/useShowToast";
import AppVersion from "../../components/AppVersion/AppVersion";
import DeleteAccount from "../../components/DeleteAccount/DeleteAccount";

// /settings/permissions: everything Nsoro can ask for on this device, with its status
// and a button to allow it. On every device: notifications, microphone, camera. In the
// Android app also the call permissions (display over other apps, full-screen call
// alerts, running in the background), which only the app's own screen can read and
// change (nsoro://call-setup). Android phones outside the app are pointed to it.

const STATUS = {
	granted: { label: "Allowed", color: "green" },
	on: { label: "Allowed", color: "green" },
	prompt: { label: "Not asked yet", color: "yellow" },
	off: { label: "Off", color: "yellow" },
	denied: { label: "Blocked", color: "red" },
	"install-first": { label: "Add to Home Screen first", color: "yellow" },
	unsupported: { label: "Not available here", color: "gray" },
	missing: { label: "Some are off", color: "yellow" },
	ok: { label: "All allowed", color: "green" },
	unknown: { label: "Check in the app", color: "yellow" },
	"needs-app": { label: "Needs the Android app", color: "yellow" },
};

const queryMedia = async (name) => {
	try {
		const result = await navigator.permissions?.query({ name });
		return result?.state || "prompt";
	} catch {
		return "prompt"; // Safari/Firefox don't let pages ask
	}
};

export default function PermissionsPage() {
	const showToast = useShowToast();
	const device = detectDevice();
	const inAndroidApp = androidAppVersion() > 0;
	const [state, setState] = useState({ notifications: "off", microphone: "prompt", camera: "prompt" });

	const refresh = useCallback(async () => {
		const [notifications, microphone, camera] = await Promise.all([getPushState().catch(() => "unsupported"), queryMedia("microphone"), queryMedia("camera")]);
		setState({ notifications, microphone, camera });
	}, []);

	useEffect(() => {
		refresh();
		const onVisible = () => document.visibilityState === "visible" && refresh(); // back from Settings
		document.addEventListener("visibilitychange", onVisible);
		return () => document.removeEventListener("visibilitychange", onVisible);
	}, [refresh]);

	const allowNotifications = async () => {
		try {
			await enablePush();
			showToast("Notifications on", "You'll get messages and calls on this device.", "success");
		} catch (error) {
			// blocked earlier: in the Android app its own screen can open the right Settings page
			if (inAndroidApp) window.location.href = callSetupLink();
			else showToast("Notifications", error.message, "error");
		}
		refresh();
	};

	const allowMedia = (kind) => async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia(kind === "camera" ? { video: true } : { audio: true });
			stream.getTracks().forEach((t) => t.stop());
		} catch {
			showToast(kind === "camera" ? "Camera" : "Microphone", "It's blocked. Allow it in your browser's site settings (the icon left of the address), or in the app's settings.", "error");
		}
		refresh();
	};

	const callSetup = inAndroidApp ? callSetupStatus() || "unknown" : device.os === "android" ? "needs-app" : null;

	return (
		<Box maxW='640px' mx='auto' px={4} py={{ base: 6, md: 10 }}>
			<Heading size='lg' mb={2}>
				Settings
			</Heading>
			<Heading size='sm' mt={6} mb={1}>
				App permissions
			</Heading>
			<Text color='nsoro.secondary' mb={6}>
				What Nsoro needs on this device for messages and calls. Tap Allow on anything that isn&apos;t allowed yet.
			</Text>

			<VStack spacing={3} align='stretch'>
				<Row
					icon={<PiBellRingingBold />}
					title='Notifications'
					text='Messages, calls, stars, comments and new followers, even when Nsoro is closed.'
					status={state.notifications}
					onAllow={state.notifications === "on" || state.notifications === "unsupported" || state.notifications === "install-first" ? null : allowNotifications}
					testId='perm-notifications'
				/>
				<Row icon={<PiMicrophoneBold />} title='Microphone' text='For voice calls, video calls and voice messages.' status={state.microphone} onAllow={state.microphone === "granted" ? null : allowMedia("microphone")} testId='perm-microphone' />
				<Row icon={<PiCameraBold />} title='Camera' text='For video calls.' status={state.camera} onAllow={state.camera === "granted" ? null : allowMedia("camera")} testId='perm-camera' />

				{callSetup && (
					<Row
						icon={<PiPhoneCallBold />}
						title='Ring like a phone call'
						text={
							inAndroidApp
								? "Display over other apps, full-screen call alerts and running in the background, so calls ring and fill your screen even when Nsoro is closed. The app's own screen shows each one."
								: "Calls only ring like a phone call, and fill your screen, in the Nsoro Android app. Here they show as a quiet notification."
						}
						status={callSetup}
						action={
							inAndroidApp ? (
								<Button as='a' href={callSetupLink()} colorScheme='brand' size='sm' borderRadius='full' data-testid='perm-call-setup'>
									Open
								</Button>
							) : (
								<Button as={RouterLink} to='/download' colorScheme='brand' size='sm' borderRadius='full' data-testid='perm-get-app'>
									Get the app
								</Button>
							)
						}
					/>
				)}
			</VStack>

			{device.os === "ios" && (
				<Text fontSize='sm' color='nsoro.secondary' mt={4}>
					On iPhone and iPad, notifications work in the Home Screen app (Share → Add to Home Screen), on iOS 16.4 or newer.
				</Text>
			)}
			<DeleteAccount />
			<AppVersion mt={8} textAlign='center' />
		</Box>
	);
}

function Row({ icon, title, text, status, onAllow, action, testId }) {
	const s = STATUS[status] || STATUS.unknown;
	return (
		<Flex gap={3} alignItems='center' p={4} borderRadius='xl' border='1px solid' borderColor='nsoro.border' bg='nsoro.surface' data-testid={testId}>
			<Box fontSize='24px' color='gold.400' flexShrink={0}>
				{icon}
			</Box>
			<Box flex={1} minW={0}>
				<Flex alignItems='center' gap={2} wrap='wrap'>
					<Text fontWeight='semibold'>{title}</Text>
					<Badge colorScheme={s.color} borderRadius='full' px={2}>
						{s.label}
					</Badge>
				</Flex>
				<Text fontSize='sm' color='nsoro.secondary' mt={1}>
					{text}
				</Text>
			</Box>
			{action ||
				(onAllow && (
					<Button onClick={onAllow} colorScheme='brand' size='sm' borderRadius='full'>
						Allow
					</Button>
				))}
		</Flex>
	);
}
