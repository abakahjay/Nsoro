import { useState } from "react";
import {
	Box,
	Button,
	Input,
	ListItem,
	Modal,
	ModalBody,
	ModalCloseButton,
	ModalContent,
	ModalFooter,
	ModalHeader,
	ModalOverlay,
	Text,
	UnorderedList,
	useDisclosure,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import API from "../../utils/api";
import useAuthStore from "../../store/useAuthStore";
import { closeSocket } from "../../utils/socket";
import { disablePush } from "../../utils/push";
import useShowToast from "../../hooks/useShowToast";

// Settings → Account → Delete account. Deletes the shared Nsoro / GH-GPT account and
// everything about it (FullBackendd DELETE /api/v1/nsoro/me, utils/deleteAccount.js).
// Confirmed by typing the username, because it can't be undone.
export default function DeleteAccount() {
	const { isOpen, onOpen, onClose } = useDisclosure();
	const authUser = useAuthStore((s) => s.user);
	const user = authUser?.user || authUser;
	const logoutUser = useAuthStore((s) => s.logoutUser);
	const setAuthUser = useAuthStore((s) => s.setAuthUser);
	const [typed, setTyped] = useState("");
	const [busy, setBusy] = useState(false);
	const showToast = useShowToast();
	const navigate = useNavigate();
	const username = (user?.username || "").trim();
	const matches = typed.trim().toLowerCase() === username.toLowerCase() && username;

	const remove = async () => {
		setBusy(true);
		try {
			await disablePush().catch(() => {}); // this device stops getting notifications
			await API.delete("/api/v1/nsoro/me", { data: { confirm: typed.trim() } });
			closeSocket();
			logoutUser();
			setAuthUser(null);
			showToast("Account deleted", "Your account and everything in it have been deleted.", "success");
			navigate("/auth");
		} catch (error) {
			showToast("Couldn't delete your account", error.response?.data?.error || error.message, "error");
			setBusy(false);
		}
	};

	return (
		<Box mt={10} p={4} borderRadius='xl' border='1px solid' borderColor='red.700' data-testid='delete-account-section'>
			<Text fontWeight='semibold'>Delete account</Text>
			<Text fontSize='sm' color='nsoro.secondary' mt={1} mb={3}>
				Permanently deletes your Nsoro and GH-GPT account and everything in it. This can&apos;t be undone.
			</Text>
			<Button colorScheme='red' variant='outline' size='sm' onClick={onOpen} data-testid='delete-account'>
				Delete my account
			</Button>

			<Modal isOpen={isOpen} onClose={onClose} isCentered size='md'>
				<ModalOverlay />
				<ModalContent bg='nsoro.surface' mx={4}>
					<ModalHeader>Delete your account?</ModalHeader>
					<ModalCloseButton />
					<ModalBody>
						<Text mb={2}>This deletes, for good:</Text>
						<UnorderedList fontSize='sm' color='nsoro.secondary' spacing={1} mb={4}>
							<ListItem>your profile, photo, posts, videos and moments</ListItem>
							<ListItem>your comments and stars, and your place in everyone&apos;s followers and following lists</ListItem>
							<ListItem>all your chats and messages, voice notes and call history</ListItem>
							<ListItem>your GH-GPT chats, images and uploaded files</ListItem>
							<ListItem>your notifications, devices and sign-ins</ListItem>
						</UnorderedList>
						<Text fontSize='sm' mb={2}>
							Type <b>{username}</b> to confirm.
						</Text>
						<Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={username} autoComplete='off' data-testid='delete-account-confirm' />
					</ModalBody>
					<ModalFooter gap={2}>
						<Button variant='ghost' onClick={onClose} isDisabled={busy}>
							Cancel
						</Button>
						<Button colorScheme='red' onClick={remove} isDisabled={!matches} isLoading={busy} data-testid='delete-account-final'>
							Delete forever
						</Button>
					</ModalFooter>
				</ModalContent>
			</Modal>
		</Box>
	);
}
