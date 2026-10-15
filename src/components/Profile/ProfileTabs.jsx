import { Box, Flex, Text } from "@chakra-ui/react";
import { PiBookmarkSimpleBold, PiGridFourBold, PiStarBold } from "react-icons/pi";

const TABS = [
	{ key: "posts", label: "Posts", icon: <PiGridFourBold /> },
	{ key: "saved", label: "Saved", icon: <PiBookmarkSimpleBold />, ownerOnly: true },
	{ key: "likes", label: "Starred", icon: <PiStarBold /> },
];

// A rounded segmented control. Saved is private, so it only shows on your own profile.
const ProfileTabs = ({ active = "posts", onChange, isOwner }) => {
	return (
		<Flex justifyContent='center' py={4} px={3}>
			<Flex bg='nsoro.surface' border='1px solid' borderColor='nsoro.border' borderRadius='full' p={1} gap={1} w={{ base: "full", sm: "auto" }}>
				{TABS.filter((t) => !t.ownerOnly || isOwner).map((tab) => {
					const on = active === tab.key;
					return (
						<Flex
							as='button'
							key={tab.key}
							onClick={() => onChange?.(tab.key)}
							flex={{ base: 1, sm: "initial" }}
							justifyContent='center'
							alignItems='center'
							gap={2}
							px={{ base: 3, sm: 5 }}
							py={2}
							borderRadius='full'
							bg={on ? "brand.600" : "transparent"}
							color={on ? "white" : "nsoro.secondary"}
							fontWeight='semibold'
							transition='background 0.15s'
							_hover={on ? undefined : { bg: "nsoro.hover", color: "nsoro.text" }}
							aria-pressed={on}
						>
							<Box fontSize={18} color={on ? "gold.300" : undefined}>
								{tab.icon}
							</Box>
							<Text fontSize='sm'>{tab.label}</Text>
						</Flex>
					);
				})}
			</Flex>
		</Flex>
	);
};

export default ProfileTabs;
