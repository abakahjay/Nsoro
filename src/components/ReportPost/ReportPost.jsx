import { useState } from "react";
import {
	Button,
	FormControl,
	FormHelperText,
	FormLabel,
	IconButton,
	Modal,
	ModalBody,
	ModalCloseButton,
	ModalContent,
	ModalFooter,
	ModalHeader,
	ModalOverlay,
	Radio,
	RadioGroup,
	Stack,
	Text,
	Textarea,
	Tooltip,
	useDisclosure,
} from "@chakra-ui/react";
import { PiFlag } from "react-icons/pi";
import API from "../../utils/api";
import useShowToast from "../../hooks/useShowToast";

const REASONS = [
	["copyright", "Copyright: it copies my photo or video"],
	["nudity", "Nudity or sexual content"],
	["harassment", "Harassment, bullying or hate"],
	["violence", "Violence or dangerous content"],
	["spam", "Spam or scam"],
	["other", "Something else"],
];

// "Report" on someone else's post -> POST /api/v1/nsoro/posts/:id/report. Admins review
// reports at /admin/reports. Copyright reports must say whose work it is.
export default function ReportPost({ postId }) {
	const { isOpen, onOpen, onClose } = useDisclosure();
	const [reason, setReason] = useState("");
	const [details, setDetails] = useState("");
	const [sending, setSending] = useState(false);
	const showToast = useShowToast();
	const copyright = reason === "copyright";
	const ready = reason && (!copyright || details.trim().length >= 10);

	const close = () => {
		setReason("");
		setDetails("");
		onClose();
	};

	const send = async () => {
		setSending(true);
		try {
			const { data } = await API.post(`/api/v1/nsoro/posts/${postId}/report`, { reason, details: details.trim() });
			showToast("Report sent", data?.message || "Thanks. Our team will review this post.", "success");
			close();
		} catch (err) {
			showToast("Could not send report", err.response?.data?.msg || err.response?.data?.message || err.message, "error");
		} finally {
			setSending(false);
		}
	};

	return (
		<>
			<Tooltip label='Report post' openDelay={400}>
				<IconButton icon={<PiFlag size={16} />} aria-label='Report post' size='xs' variant='ghost' color='gray.500' onClick={onOpen} data-testid='button-report-post' />
			</Tooltip>
			<Modal isOpen={isOpen} onClose={close} isCentered size={{ base: "full", sm: "md" }}>
				<ModalOverlay />
				<ModalContent>
					<ModalHeader>Report post</ModalHeader>
					<ModalCloseButton />
					<ModalBody>
						<RadioGroup value={reason} onChange={setReason}>
							<Stack spacing={3}>
								{REASONS.map(([value, label]) => (
									<Radio key={value} value={value} colorScheme='brand'>
										<Text fontSize={14}>{label}</Text>
									</Radio>
								))}
							</Stack>
						</RadioGroup>
						{reason && (
							<FormControl mt={5}>
								<FormLabel fontSize={14}>{copyright ? "Your work and how to reach you" : "Anything else we should know? (optional)"}</FormLabel>
								<Textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} rows={4} fontSize={14}
									placeholder={copyright ? "Describe the original photo or video you own, and give an email or phone number." : ""} />
								{copyright && (
									<FormHelperText fontSize={12}>
										By sending this you state in good faith that the post uses your work without permission and that this report is accurate.
									</FormHelperText>
								)}
							</FormControl>
						)}
					</ModalBody>
					<ModalFooter gap={2}>
						<Button variant='ghost' onClick={close}>Cancel</Button>
						<Button colorScheme='brand' onClick={send} isDisabled={!ready} isLoading={sending} data-testid='button-send-report'>Send report</Button>
					</ModalFooter>
				</ModalContent>
			</Modal>
		</>
	);
}
