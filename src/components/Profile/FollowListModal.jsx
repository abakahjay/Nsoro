import { useEffect, useMemo, useState } from "react";
import {
	Avatar,
	Box,
	Button,
	Flex,
	Input,
	InputGroup,
	InputLeftElement,
	Link,
	Modal,
	ModalBody,
	ModalCloseButton,
	ModalContent,
	ModalHeader,
	ModalOverlay,
	Skeleton,
	Text,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import { Link as RouterLink } from "react-router-dom";
import API from "../../utils/api";
import { avatarUrl } from "../../utils/media";
import useAuthStore from "../../store/useAuthStore";
import useFollowUser from "../../hooks/useFollowUser";

// Anyone's followers / following list, opened from the counts on a profile.
// Loads the profile fresh (followers and following come back with names and photos).
export default function FollowListModal({ username, list, isOpen, onClose }) {
	const [people, setPeople] = useState(null);
	const [filter, setFilter] = useState("");
	const authUser = useAuthStore((state) => state.user);
	const me = authUser?.user || authUser;

	useEffect(() => {
		if (!isOpen) return;
		const controller = new AbortController();
		setPeople(null);
		setFilter("");
		API.patch(`/api/v1/users/${encodeURIComponent(username)}`, null, { signal: controller.signal })
			.then(({ data }) => setPeople((data.user?.[list] || []).filter((u) => u && typeof u === "object")))
			.catch((e) => e.message !== "canceled" && setPeople([]));
		return () => controller.abort();
	}, [isOpen, username, list]);

	const shown = useMemo(() => {
		const q = filter.trim().toLowerCase();
		if (!q || !people) return people;
		return people.filter((u) => `${u.username} ${u.firstName || ""} ${u.lastName || ""}`.toLowerCase().includes(q));
	}, [people, filter]);

	const title = list === "followers" ? "Followers" : "Following";

	return (
		<Modal isOpen={isOpen} onClose={onClose} size={{ base: "full", md: "md" }} scrollBehavior='inside'>
			<ModalOverlay backdropFilter='blur(2px)' />
			<ModalContent borderRadius={{ base: 0, md: "2xl" }}>
				<ModalHeader textAlign='center' fontSize='md' borderBottom='1px solid' borderColor='nsoro.border'>
					{title}
				</ModalHeader>
				<ModalCloseButton />
				<ModalBody px={0} minH='320px'>
					<InputGroup px={4} mb={2}>
						<InputLeftElement pointerEvents='none' pl={6}>
							<SearchIcon color='nsoro.secondary' />
						</InputLeftElement>
						<Input placeholder='Search' value={filter} onChange={(e) => setFilter(e.target.value)} variant='filled' />
					</InputGroup>

					{people === null &&
						[0, 1, 2, 3].map((i) => (
							<Flex key={i} gap={3} alignItems='center' px={5} py={2}>
								<Skeleton w='44px' h='44px' borderRadius='30%' />
								<Box flex={1}>
									<Skeleton h='10px' w='40%' mb={2} />
									<Skeleton h='8px' w='60%' />
								</Box>
							</Flex>
						))}

					{shown?.length === 0 && (
						<Text px={6} py={6} color='nsoro.secondary' fontSize='sm' textAlign='center'>
							{filter ? "No one matches that." : list === "followers" ? "No followers yet." : "Not following anyone yet."}
						</Text>
					)}

					{shown?.map((u) => (
						<PersonRow key={u._id} person={u} isMe={u._id === me?._id} onOpen={onClose} />
					))}
				</ModalBody>
			</ModalContent>
		</Modal>
	);
}

function PersonRow({ person, isMe, onOpen }) {
	const { isFollowing, isUpdating, handleFollowUser } = useFollowUser(person._id);
	const fullName = [person.firstName, person.lastName].filter(Boolean).join(" ");
	return (
		<Flex alignItems='center' gap={3} px={5} py={2} _hover={{ bg: "nsoro.hover" }}>
			<Link as={RouterLink} to={`/${person.username}`} onClick={onOpen} display='flex' alignItems='center' gap={3} flex={1} minW={0} _hover={{ textDecoration: "none" }}>
				<Avatar src={avatarUrl(person)} name={person.username} referrerPolicy='no-referrer' w='44px' h='44px' />
				<Box minW={0}>
					<Text fontWeight='semibold' fontSize='sm' noOfLines={1}>
						{person.username}
					</Text>
					{fullName && (
						<Text color='nsoro.secondary' fontSize='sm' noOfLines={1}>
							{fullName}
						</Text>
					)}
				</Box>
			</Link>
			{!isMe && (
				<Button
					size='sm'
					minW='92px'
					colorScheme={isFollowing ? undefined : "brand"}
					bg={isFollowing ? "nsoro.raised" : undefined}
					border={isFollowing ? "1px solid" : undefined}
					borderColor='nsoro.border'
					onClick={handleFollowUser}
					isLoading={isUpdating}
				>
					{isFollowing ? "Following" : "Follow"}
				</Button>
			)}
		</Flex>
	);
}
