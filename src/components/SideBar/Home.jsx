import { Box, Link, Tooltip } from "@chakra-ui/react";
import { PiHouseFill } from "react-icons/pi";
import { NavLink as RouterLink } from "react-router-dom";

const Home = () => {
	return (
		<Tooltip
			hasArrow
			label={"Home"}
			placement='right'
			ml={1}
			openDelay={500}
			display={{ base: "block", xl: "none" }}
		>
			<Link
				display={"flex"}
				to={"/"}
				end
				as={RouterLink}
				alignItems={"center"}
				gap={4}
				_hover={{ bg: "nsoro.hover" }}
				borderRadius="xl"
				p={2}
				w={{ base: 10, xl: "full" }}
				justifyContent={{ base: "center", xl: "flex-start" }}
			>
				<PiHouseFill size={25} />
				<Box display={{ base: "none", xl: "block" }}>Home</Box>
			</Link>
		</Tooltip>
	);
};

export default Home;
