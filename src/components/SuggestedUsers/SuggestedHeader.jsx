import { Avatar, Box, Flex, Link, Text } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { avatarUrl } from "../../utils/media";

// Your account at the top of the right column.
export default function SuggestedHeader({ user }) {
	const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
	return (
		<Flex w='full' alignItems='center' gap={3}>
			<Link as={RouterLink} to={`/${user.username}`} flexShrink={0}>
				<Avatar src={avatarUrl(user)} name={user.username} w='44px' h='44px' referrerPolicy='no-referrer' />
			</Link>
			<Box flex={1} minW={0}>
				<Link as={RouterLink} to={`/${user.username}`} fontWeight='semibold' fontSize='sm' noOfLines={1}>
					{user.username}
				</Link>
				<Text fontSize='sm' color='nsoro.secondary' noOfLines={1}>
					{fullName}
				</Text>
			</Box>
		</Flex>
	);
}
