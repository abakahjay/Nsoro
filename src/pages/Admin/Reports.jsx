import { useCallback, useEffect, useState } from "react";
import { Badge, Box, Button, ButtonGroup, Flex, Heading, Link, Spinner, Stack, Text } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import API from "../../utils/api";
import useAuthStore from "../../store/useAuthStore";
import useShowToast from "../../hooks/useShowToast";
import { timeAgo } from "../../utils/timeAgo";

const LABEL = { copyright: "Copyright", nudity: "Nudity", harassment: "Harassment", violence: "Violence", spam: "Spam", other: "Other" };

// /admin/reports - review reported posts: remove the post (closes all its reports) or
// dismiss. Admins only (User.role === "admin"; the backend enforces it).
export default function ReportsPage() {
	const authUser = useAuthStore((state) => state.user);
	const user = authUser?.user || authUser;
	const showToast = useShowToast();
	const [status, setStatus] = useState("open");
	const [reports, setReports] = useState(null);
	const [busy, setBusy] = useState(null);

	const load = useCallback(async () => {
		setReports(null);
		try {
			const { data } = await API.get(`/api/v1/nsoro/reports?status=${status}`);
			setReports(data.reports);
		} catch (err) {
			setReports([]);
			showToast("Could not load reports", err.response?.data?.msg || err.message, "error");
		}
	}, [status, showToast]);

	useEffect(() => {
		if (user?.role === "admin") load();
	}, [user?.role, load]);

	const act = async (r, action) => {
		if (action === "remove" && !window.confirm("Remove this post for everyone?")) return;
		setBusy(r._id);
		try {
			if (action === "remove") await API.delete(`/api/v1/nsoro/posts/${r.post._id}`);
			else await API.patch(`/api/v1/nsoro/reports/${r._id}`, { status: "dismissed" });
			showToast(action === "remove" ? "Post removed" : "Report dismissed", "", "success");
			load();
		} catch (err) {
			showToast("Action failed", err.response?.data?.msg || err.message, "error");
		} finally {
			setBusy(null);
		}
	};

	if (user?.role !== "admin") {
		return (
			<Box maxW='560px' mx='auto' px={4} py={12} textAlign='center'>
				<Heading size='md' mb={2}>Admins only</Heading>
				<Text color='gray.400'>This page is for the Nsoro team.</Text>
			</Box>
		);
	}

	return (
		<Box maxW='760px' mx='auto' px={4} py={8}>
			<Flex justify='space-between' align='center' mb={6} gap={3} wrap='wrap'>
				<Heading size='lg'>Reported posts</Heading>
				<ButtonGroup size='sm' isAttached variant='outline'>
					{["open", "removed", "dismissed"].map((s) => (
						<Button key={s} onClick={() => setStatus(s)} colorScheme={status === s ? "brand" : "gray"}>{s[0].toUpperCase() + s.slice(1)}</Button>
					))}
				</ButtonGroup>
			</Flex>

			{reports === null ? (
				<Flex justify='center' py={10}><Spinner /></Flex>
			) : reports.length === 0 ? (
				<Text color='gray.400'>No {status} reports.</Text>
			) : (
				<Stack spacing={4}>
					{reports.map((r) => (
						<Box key={r._id} border='1px solid' borderColor='whiteAlpha.300' borderRadius='lg' p={4}>
							<Flex justify='space-between' gap={3} wrap='wrap'>
								<Flex gap={2} align='center' wrap='wrap'>
									<Badge colorScheme={r.reason === "copyright" ? "purple" : "red"}>{LABEL[r.reason] || r.reason}</Badge>
									<Text fontSize={13} color='gray.400'>
										by @{r.reportedBy?.username || "deleted user"} · {timeAgo(new Date(r.createdAt).getTime())}
									</Text>
								</Flex>
								{r.post ? (
									<Link as={RouterLink} to={`/p/${r.post._id}`} fontSize={13} color='brand.400'>Open post</Link>
								) : (
									<Text fontSize={13} color='gray.500'>Post already deleted</Text>
								)}
							</Flex>
							<Text mt={2} fontSize={14}>
								Post by <b>@{r.postOwner?.username || "unknown"}</b>
								{r.post?.caption ? <> · “{r.post.caption.slice(0, 120)}”</> : null}
							</Text>
							{r.ownerRemovedPosts > 0 && (
								<Text mt={1} fontSize={13} color='orange.300'>
									{r.ownerRemovedPosts} of this person&apos;s posts were already removed after reports.
								</Text>
							)}
							{r.details && <Text mt={2} fontSize={14} color='gray.300' whiteSpace='pre-wrap'>{r.details}</Text>}
							{status === "open" && r.post && (
								<ButtonGroup size='sm' mt={4}>
									<Button colorScheme='red' onClick={() => act(r, "remove")} isLoading={busy === r._id}>Remove post</Button>
									<Button variant='ghost' onClick={() => act(r, "dismiss")} isDisabled={busy === r._id}>Dismiss</Button>
								</ButtonGroup>
							)}
						</Box>
					))}
				</Stack>
			)}
		</Box>
	);
}
