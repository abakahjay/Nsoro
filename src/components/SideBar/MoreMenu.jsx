import { Box, Flex, Menu, MenuButton, MenuDivider, MenuItem, MenuList, Portal, Tooltip } from "@chakra-ui/react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { RxHamburgerMenu } from "react-icons/rx";
import { PiBookmarkSimpleBold } from "react-icons/pi";
import { FiDownload, FiSend, FiShield, FiUser } from "react-icons/fi";
import { isInstalled } from "../../utils/install";
import AppVersion from "../AppVersion/AppVersion";

// The ☰ "More" menu at the bottom of the left rail.
export default function MoreMenu({ authUser, onLogout }) {
	const user = authUser?.user || authUser;
	const navigate = useNavigate();

	return (
		<Menu placement='top-start' isLazy>
			<Tooltip hasArrow label='More' placement='right' ml={1} openDelay={500} display={{ base: "block", xl: "none" }}>
				<MenuButton
					as={Flex}
					role='button'
					aria-label='More'
					alignItems='center'
					gap={4}
					_hover={{ bg: "nsoro.hover" }}
					borderRadius={6}
					p={2}
					w={{ base: 10, xl: "full" }}
					cursor='pointer'
				>
					<Flex alignItems='center' gap={4} justifyContent={{ base: "center", xl: "flex-start" }}>
						<RxHamburgerMenu size={25} />
						<Box display={{ base: "none", xl: "block" }}>More</Box>
					</Flex>
				</MenuButton>
			</Tooltip>
			{/* Portal: the sidebar scrolls (overflow auto), which clipped the menu to the
			    72px rail on tablets */}
			<Portal>
			<MenuList minW='250px' py={2} borderRadius='xl' boxShadow='dark-lg' zIndex='popover'>
				<MenuItem icon={<PiBookmarkSimpleBold size={18} />} as={RouterLink} to={`/${user?.username}?tab=saved`}>
					Saved
				</MenuItem>
				<MenuItem icon={<FiShield size={18} />} as={RouterLink} to='/settings/permissions'>
					App permissions
				</MenuItem>
				{!isInstalled() && (
					<MenuItem icon={<FiDownload size={18} />} as={RouterLink} to='/download'>
						Get the app
					</MenuItem>
				)}
				{user?.role === "admin" && (
					<MenuItem icon={<FiSend size={18} />} as={RouterLink} to='/admin/updates'>
						Send an update
					</MenuItem>
				)}
				<MenuItem icon={<FiUser size={18} />} as='a' href='https://portfolio-8jmo.onrender.com/' target='_blank' rel='noreferrer'>
					About the developer
				</MenuItem>
				<MenuDivider borderColor='nsoro.border' />
				<MenuItem
					onClick={() => {
						onLogout(user?._id);
						navigate("/auth");
					}}
				>
					Switch accounts
				</MenuItem>
				<MenuItem onClick={() => onLogout(user?._id)}>Log out</MenuItem>
				<MenuDivider borderColor='nsoro.border' />
				<AppVersion px={3} py={1} maxW='250px' />
			</MenuList>
			</Portal>
		</Menu>
	);
}
