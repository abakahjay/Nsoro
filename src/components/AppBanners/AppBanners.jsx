import { useEffect, useState } from "react";
import { Box, Button, CloseButton, Flex, Text } from "@chakra-ui/react";
import { BsAndroid2, BsArrowUpCircleFill, BsTelephoneFill } from "react-icons/bs";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { androidAppVersion, callSetupLink, callSetupStatus, getLatestVersions, readTime, updateLink, writeTime } from "../../utils/appVersion";

const SETUP_HIDDEN_KEY = "nsoro-call-setup-hidden-at";
const GET_APP_HIDDEN_KEY = "nsoro-get-android-app-hidden-at";
const GET_APP_HIDE_MS = 3 * 24 * 3600 * 1000;
const HIDE_AFTER_CLOSE_MS = 24 * 3600 * 1000; // "x": ask again tomorrow
const HIDE_AFTER_SETUP_MS = 3600 * 1000; // tapped "Set up": the app reports back on its next launch

// Something calls need is still missing: notifications aren't on, or the app said so
// on its last launch (older apps never say, so ask until they do).
const setupNeeded = () => {
	const notificationsOff = typeof Notification !== "undefined" && Notification.permission !== "granted";
	return notificationsOff || callSetupStatus() !== "ok";
};
const setupHidden = () => {
	const hiddenAt = readTime(SETUP_HIDDEN_KEY);
	return Date.now() - hiddenAt < (readTime(`${SETUP_HIDDEN_KEY}-long`) ? HIDE_AFTER_CLOSE_MS : HIDE_AFTER_SETUP_MS);
};

// Cards that only appear inside the Android app (see utils/appVersion.js):
//  - "Update available" when /downloads/version.json has a newer versionCode;
//    the button opens the app's own updater (or downloads the APK on old apps).
//  - "Ring like a phone call" while anything calls need is missing: opens the app's
//    checklist (notifications, appear on top, full-screen alerts, battery). Shown here
//    because reopening the app from recent apps never runs the app's own start-up list.
// An Android phone using Nsoro in Chrome or as Chrome's installed web app (not the
// APK app): calls there only arrive as a quiet notification, so point to the real app.
function GetAndroidApp() {
	const { pathname } = useLocation();
	const [hidden, setHidden] = useState(() => Date.now() - readTime(GET_APP_HIDDEN_KEY) < GET_APP_HIDE_MS);
	if (hidden || pathname.startsWith("/download") || !/Android/i.test(navigator.userAgent) || androidAppVersion()) return null;
	const close = () => {
		writeTime(GET_APP_HIDDEN_KEY);
		setHidden(true);
	};
	return (
		<Box position='fixed' top='max(12px, env(safe-area-inset-top))' left='50%' transform='translateX(-50%)' zIndex={1500} w='min(440px, calc(100vw - 24px))'>
			<Card icon={<BsAndroid2 />} title='Get the Nsoro Android app' text='Calls only ring like a phone call, and fill your screen, in the Android app. Here they just show as a quiet notification.' onClose={close}>
				<Button as={RouterLink} to='/download' onClick={close} colorScheme='brand' size='sm' borderRadius='full' data-testid='get-android-app'>
					Get the app
				</Button>
			</Card>
		</Box>
	);
}

export default function AppBanners() {
	const [version] = useState(androidAppVersion);
	const [latest, setLatest] = useState(null);
	const [hideUpdate, setHideUpdate] = useState(false);
	const [showSetup, setShowSetup] = useState(() => androidAppVersion() >= 7 && setupNeeded() && !setupHidden());

	useEffect(() => {
		if (!version) return;
		let live = true;
		getLatestVersions().then((v) => live && setLatest(v?.android || null));
		return () => {
			live = false;
		};
	}, [version]);

	if (!version) return <GetAndroidApp />;
	const update = !hideUpdate && latest && Number(latest.versionCode) > version ? latest : null;
	if (!update && !showSetup) return null;

	// closed with "x": a day; tapped "Set up": an hour (long enough to come back from Settings)
	const hideSetup = (long) => {
		writeTime(SETUP_HIDDEN_KEY);
		if (long) writeTime(`${SETUP_HIDDEN_KEY}-long`);
		else {
			try {
				localStorage.removeItem(`${SETUP_HIDDEN_KEY}-long`);
			} catch {
				// private mode
			}
		}
		setShowSetup(false);
	};

	return (
		<Box position='fixed' top='max(12px, env(safe-area-inset-top))' left='50%' transform='translateX(-50%)' zIndex={1500} w='min(440px, calc(100vw - 24px))'>
			{update ? (
				<Card
					icon={<BsArrowUpCircleFill />}
					title={`Update available: Nsoro ${update.versionName || ""}`.trim()}
					text='Get the newest features and fixes. Your chats and settings stay as they are.'
					onClose={() => setHideUpdate(true)}
				>
					<Button as='a' href={updateLink(version, update.url || "/downloads/Nsoro.apk")} colorScheme='brand' size='sm' borderRadius='full' data-testid='app-update'>
						Update
					</Button>
				</Card>
			) : (
				<Card
					icon={<BsTelephoneFill />}
					title='Ring like a phone call'
					text="Calls can't ring yet when Nsoro is closed. Tap Set up and allow everything on the list."
					onClose={() => hideSetup(true)}
				>
					<Button as='a' href={callSetupLink()} onClick={() => hideSetup(false)} colorScheme='brand' size='sm' borderRadius='full' data-testid='call-setup'>
						Set up
					</Button>
				</Card>
			)}
		</Box>
	);
}

function Card({ icon, title, text, onClose, children }) {
	return (
		<Flex gap={3} alignItems='flex-start' bg='nsoro.surface' border='1px solid' borderColor='nsoro.border' borderRadius='xl' boxShadow='dark-lg' p={3}>
			<Box color='gold.400' fontSize='22px' mt='2px'>
				{icon}
			</Box>
			<Box flex={1} minW={0}>
				<Text fontWeight='semibold' fontSize='sm'>
					{title}
				</Text>
				<Text fontSize='xs' color='nsoro.secondary' mt={1} mb={2}>
					{text}
				</Text>
				{children}
			</Box>
			<CloseButton size='sm' onClick={onClose} aria-label='Close' />
		</Flex>
	);
}
