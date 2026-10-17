import { Box, Flex, Link } from "@chakra-ui/react";
import { NavLink } from "react-router-dom";
import { PiHouseFill, PiPlayCircleFill } from "react-icons/pi";
import { NsoroLogo, MessagesLogo, NotificationsLogo, SearchLogo } from "../../assets/constants";
import CreatePost from "../SideBar/CreatePost";
import ProfileLink from "../SideBar/ProfileLink";
import { UnreadBadge } from "../SideBar/Notifications";
import useNotificationStore from "../../store/useNotificationStore";
import useInboxStore from "../../store/useInboxStore";

// Phone layout (below the `md` breakpoint), like a native app: a top bar with the
// logo + messages, and a fixed bottom tab bar (Home, Search, Watch, Create, Activity, Profile). PageLayout hides the sidebar there.
export const MOBILE_TOP_BAR_H = "56px";
export const MOBILE_BOTTOM_BAR_H = "56px";

// The current tab turns gold.
const IconLink = ({ to, label, end, children }) => (
	<Link
		as={NavLink}
		to={to}
		end={end}
		aria-label={label}
		p={2}
		display='flex'
		alignItems='center'
		justifyContent='center'
		borderRadius='xl'
		sx={{ "&.active, &.active svg": { color: "#f5c542 !important" } }}
	>
		{children}
	</Link>
);

export function MobileTopBar() {
	const unreadMessages = useInboxStore((state) => state.unread);
	return (
		<Flex
			display={{ base: "flex", md: "none" }}
			position='sticky'
			top={0}
			zIndex={20}
			h={MOBILE_TOP_BAR_H}
			px={3}
			alignItems='center'
			justifyContent='space-between'
			bg='nsoro.surface'
			borderBottom='1px solid'
			borderColor='nsoro.border'
		>
			<Link as={NavLink} to='/' aria-label='Home' transform='scale(0.8)' transformOrigin='left center'>
				<NsoroLogo />
			</Link>
			<Flex gap={1}>
				<IconLink to='/messages' label='Messages'>
					<Box position='relative'>
						<MessagesLogo />
						<UnreadBadge count={unreadMessages} />
					</Box>
				</IconLink>
			</Flex>
		</Flex>
	);
}

export function MobileBottomNav({ authUser, onLogout }) {
	const unread = useNotificationStore((state) => state.unread);
	return (
		<Flex
			display={{ base: "flex", md: "none" }}
			position='fixed'
			bottom={0}
			left={0}
			right={0}
			zIndex={20}
			h={MOBILE_BOTTOM_BAR_H}
			pb='env(safe-area-inset-bottom)'
			bg='nsoro.surface'
			borderTop='1px solid'
			borderColor='nsoro.border'
			alignItems='center'
			justifyContent='space-around'
		>
			<IconLink to='/' end label='Home'>
				<PiHouseFill size={25} />
			</IconLink>
			<IconLink to='/search' label='Search'>
				<SearchLogo />
			</IconLink>
			<IconLink to='/watch' label='Watch'>
				<PiPlayCircleFill size={26} />
			</IconLink>
			<CreatePost />
			<IconLink to='/notifications' label='Notifications'>
				<Box position='relative'>
					<NotificationsLogo />
					<UnreadBadge count={unread} />
				</Box>
			</IconLink>
			<ProfileLink authUser={authUser} onLogout={onLogout} />
		</Flex>
	);
}
