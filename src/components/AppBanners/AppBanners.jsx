import { useEffect, useState } from "react";
import { Box, Button, CloseButton, Flex, Text } from "@chakra-ui/react";
import { BsArrowUpCircleFill, BsTelephoneFill } from "react-icons/bs";
import { androidAppVersion, callSetupLink, getLatestVersions, remember, remembered, updateLink } from "../../utils/appVersion";

const CALL_SETUP_KEY = "nsoro-call-setup-v1";

// Cards that only appear inside the Android app (see utils/appVersion.js):
//  - "Update available" when /downloads/version.json has a newer versionCode;
//    the button opens the app's own updater (or downloads the APK on old apps).
//  - once, "Ring like a phone call": opens the app's screen that asks for
//    "Display over other apps", so incoming calls cover the screen.
export default function AppBanners() {
	const [version] = useState(androidAppVersion);
	const [latest, setLatest] = useState(null);
	const [hideUpdate, setHideUpdate] = useState(false);
	const [showSetup, setShowSetup] = useState(() => androidAppVersion() >= 5 && !remembered(CALL_SETUP_KEY));

	useEffect(() => {
		if (!version) return;
		let live = true;
		getLatestVersions().then((v) => live && setLatest(v?.android || null));
		return () => {
			live = false;
		};
	}, [version]);

	if (!version) return null;
	const update = !hideUpdate && latest && Number(latest.versionCode) > version ? latest : null;
	if (!update && !showSetup) return null;

	const doneSetup = () => {
		remember(CALL_SETUP_KEY);
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
					text='Let Nsoro calls fill your screen and ring, even while you use another app.'
					onClose={doneSetup}
				>
					<Button as='a' href={callSetupLink()} onClick={doneSetup} colorScheme='brand' size='sm' borderRadius='full' data-testid='call-setup'>
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
