import { useState } from "react";
import { Grid, GridItem, Modal, ModalBody, ModalCloseButton, ModalContent, ModalOverlay, Skeleton, Text } from "@chakra-ui/react";
import PostMedia from "../FeedPosts/PostMedia";
import FeedPost from "../FeedPosts/FeedPost";

// 3-column grid (Explore, Saved, Starred). Tapping a tile opens the full post -
// header, media, stars, comments - read-only as far as deleting goes, since these
// posts can belong to anyone.
export default function PostGrid({ posts, emptyText = "No posts yet." }) {
	const [openPost, setOpenPost] = useState(null);

	return (
		<>
			<Grid templateColumns='repeat(3, 1fr)' gap={{ base: 1, md: 3 }} px={{ base: 1, md: 0 }}>
				{posts === null && Array.from({ length: 9 }, (_, i) => <Skeleton key={i} aspectRatio={1} borderRadius='xl' />)}
				{posts?.map((post) => (
					<GridItem
						key={post._id}
						aspectRatio={1}
						overflow='hidden'
						borderRadius={{ base: "md", md: "xl" }}
						cursor='pointer'
						onClick={() => setOpenPost(post)}
						role='button'
						tabIndex={0}
						_hover={{ opacity: 0.85 }}
					>
						<PostMedia post={post} variant='thumb' />
					</GridItem>
				))}
			</Grid>
			{posts?.length === 0 && (
				<Text color='gray.400' textAlign='center' mt={10}>
					{emptyText}
				</Text>
			)}

			<Modal isOpen={!!openPost} onClose={() => setOpenPost(null)} size={{ base: "full", md: "xl" }} scrollBehavior='inside'>
				<ModalOverlay />
				<ModalContent bg='nsoro.bg'>
					<ModalCloseButton zIndex={2} />
					<ModalBody pt={10}>{openPost && <FeedPost post={openPost} />}</ModalBody>
				</ModalContent>
			</Modal>
		</>
	);
}
