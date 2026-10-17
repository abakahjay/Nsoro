import { Box, Link, Tooltip } from "@chakra-ui/react";
import { PiPlayCircleFill } from "react-icons/pi";
import { NavLink as RouterLink } from "react-router-dom";

// Watch: videos one at a time, full screen (pages/Watch).
const Watch = () => (
	<Tooltip hasArrow label='Watch' placement='right' ml={1} openDelay={500} display={{ base: "block", xl: "none" }}>
		<Link
			display='flex'
			to='/watch'
			as={RouterLink}
			alignItems='center'
			gap={4}
			_hover={{ bg: "nsoro.hover" }}
			borderRadius='xl'
			p={2}
			w={{ base: 10, xl: "full" }}
			justifyContent={{ base: "center", xl: "flex-start" }}
		>
			<PiPlayCircleFill size={25} />
			<Box display={{ base: "none", xl: "block" }}>Watch</Box>
		</Link>
	</Tooltip>
);

export default Watch;
