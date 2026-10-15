import { Box, Flex, Text } from "@chakra-ui/react";
import { PiBookmarkSimpleBold, PiGridFourBold, PiHeartBold } from "react-icons/pi";
import { ReelsLogo } from "../../assets/constants";

const TABS = [
	{ key: "posts", label: "Posts", icon: <PiGridFourBold /> },
	{ key: "reels", label: "Reels", icon: <ReelsLogo /> },
	{ key: "saved", label: "Saved", icon: <PiBookmarkSimpleBold />, ownerOnly: true },
	{ key: "likes", label: "Likes", icon: <PiHeartBold /> },
];

// Saved is private, so it only shows on your own profile.
const ProfileTabs = ({ active = "posts", onChange, isOwner }) => {
	return (
		<Flex
			w={"full"}
			justifyContent={"center"}
			gap={{ base: 4, sm: 10 }}
			textTransform={"uppercase"}
			fontWeight={"bold"}
		>
			{TABS.filter((t) => !t.ownerOnly || isOwner).map((tab) => (
				<Flex
					as='button'
					key={tab.key}
					onClick={() => onChange?.(tab.key)}
					borderTop={active === tab.key ? "1px solid white" : "1px solid transparent"}
					color={active === tab.key ? "white" : "gray.500"}
					alignItems={"center"}
					p='3'
					gap={1}
					aria-pressed={active === tab.key}
				>
					<Box fontSize={20}>{tab.icon}</Box>
					<Text fontSize={12} display={{ base: "none", sm: "block" }}>
						{tab.label}
					</Text>
				</Flex>
			))}
		</Flex>
	);
};

export default ProfileTabs;
