import { useEffect, useState } from "react";
import { Button, Flex, Modal, ModalBody, ModalContent, ModalOverlay, Text, VStack } from "@chakra-ui/react";
import { FiBell } from "react-icons/fi";
import useShowToast from "../../hooks/useShowToast";
import { enablePush, getPushState } from "../../utils/push";

// Opens by itself after sign-in when this device hasn't decided about notifications
// yet. Browsers only show their own "Allow notifications?" popup after a tap, so
// "Allow" here is that tap. "Not now" asks again in 3 days.
// iPhone/iPad in Safari can't get notifications until Nsoro is on the Home Screen,
// so they get a "add it to your Home Screen" version instead.
// Notifications are also what gives a sender two ticks while this phone's app is
// closed (the push's delivery receipt), so it's worth asking.
const SNOOZE_KEY = "nsoro-push-prompt-snoozed";
const SNOOZE_MS = 3 * 24 * 3600 * 1000;

const snoozed = () => {
	try {
		return Date.now() - Number(localStorage.getItem(SNOOZE_KEY) || 0) < SNOOZE_MS;
	} catch {
		return false;
	}
};

export default function NotificationPrompt() {
	const showToast = useShowToast();
	const [open, setOpen] = useState(false);
	const [busy, setBusy] = useState(false);
	const [installFirst, setInstallFirst] = useState(false);

	useEffect(() => {
		let cancelled = false;
		// Let the page settle first so the prompt doesn't flash during sign-in.
		const timer = setTimeout(async () => {
			if (snoozed()) return;
			const state = await getPushState().catch(() => "unsupported");
			if (cancelled) return;
			if (state === "install-first") {
				setInstallFirst(true);
				setOpen(true);
				return;
			}
			if (typeof Notification === "undefined" || Notification.permission !== "default") return;
			if (state === "off") setOpen(true);
		}, 1500);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, []);

	const allow = async () => {
		setBusy(true);
		try {
			await enablePush();
			showToast("Notifications on", "You'll get alerts on this device, even when Nsoro is closed.", "success", 3000);
		} catch (err) {
			showToast("Notifications are off", err.message, "warning");
		} finally {
			setBusy(false);
			setOpen(false);
		}
	};

	const later = () => {
		try {
			localStorage.setItem(SNOOZE_KEY, String(Date.now()));
		} catch {
			/* private mode */
		}
		setOpen(false);
	};

	return (
		<Modal isOpen={open} onClose={later} isCentered size='sm'>
			<ModalOverlay />
			<ModalContent mx={4} borderRadius='2xl'>
				<ModalBody p={6}>
					<VStack spacing={4} textAlign='center'>
						<Flex w='64px' h='64px' borderRadius='full' bg='linear-gradient(45deg, #f2b705, #2f9e44, #0a7a4b)' alignItems='center' justifyContent='center'>
							<FiBell size={30} color='white' />
						</Flex>
						{installFirst ? (
							<>
								<Text fontWeight='bold' fontSize='lg'>Get messages and calls when Nsoro is closed</Text>
								<Text color='nsoro.secondary' fontSize='sm'>
									On iPhone and iPad, tap Share, then &ldquo;Add to Home Screen&rdquo;. Open Nsoro from your Home Screen and allow notifications &ndash; then calls ring and friends see two ticks when their messages reach you.
								</Text>
								{/* a plain link: this prompt is mounted outside the router (App.jsx) */}
								<Button as='a' href='/download' colorScheme='brand' w='full' onClick={later}>
									Show me how
								</Button>
							</>
						) : (
							<>
								<Text fontWeight='bold' fontSize='lg'>Turn on notifications</Text>
								<Text color='nsoro.secondary' fontSize='sm'>
									Get messages, calls, stars, comments and new followers in your notification bar, even when Nsoro is closed &ndash; and friends see two ticks when their messages reach your phone.
								</Text>
								<Button colorScheme='brand' w='full' onClick={allow} isLoading={busy}>Allow</Button>
							</>
						)}
						<Button variant='ghost' w='full' size='sm' onClick={later} isDisabled={busy}>Not now</Button>
					</VStack>
				</ModalBody>
			</ModalContent>
		</Modal>
	);
}
