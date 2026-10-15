import { useRef, useState } from 'react'
import PostHeader from './PostHeader'
import PostFooter from './PostFooter'
import { Box } from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import { PiStarFill } from 'react-icons/pi'
import { useGetUserById } from '../../hooks/useGetUserById';
import useLikePost from '../../hooks/useLikePost';
import PostMedia from './PostMedia';

const starPop = keyframes`
  0% { transform: scale(0) rotate(-30deg); opacity: 0; }
  15% { transform: scale(1.2) rotate(8deg); opacity: 1; }
  30% { transform: scale(0.95); }
  45%, 80% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1); opacity: 0; }
`;

export default function FeedPost({post}) {
    const {
        userProfile,
        profileImageUrl, // Return the profile image URL
        imageLoading, // Return the image loading state
    } = useGetUserById(post.createdBy);
    const likeState = useLikePost(post);
    const [showStar, setShowStar] = useState(0);
    const lastTap = useRef(0);

    // Double-tap (touch) or double-click to star a post. Never un-stars.
    const handleTap = () => {
        const now = Date.now();
        if (now - lastTap.current < 300) {
            if (!likeState.isLiked) likeState.handleLikePost();
            setShowStar((n) => n + 1);
            lastTap.current = 0;
        } else {
            lastTap.current = now;
        }
    };

    return (
        // Each post is a card: rounded on tablets and up, full-width with a gap on phones.
        <Box
            as='article'
            bg='nsoro.surface'
            border='1px solid'
            borderColor='nsoro.border'
            borderX={{ base: "none", md: "1px solid" }}
            borderLeftColor={{ md: "nsoro.border" }}
            borderRightColor={{ md: "nsoro.border" }}
            borderRadius={{ base: 0, md: "2xl" }}
            mb={{ base: 2, md: 5 }}
            overflow='hidden'
        >
            <Box px={{ base: 3, md: 4 }} pt={1}>
                <PostHeader post={post} profileImageUrl={profileImageUrl} creatorProfile={userProfile} imageLoading={imageLoading}/>
            </Box>
            {/* media runs edge to edge inside the card */}
            <Box bg='black' overflow={"hidden"} position='relative' onClick={handleTap} userSelect='none'>
				<PostMedia post={post} variant="feed" />
				{showStar > 0 && (
					<Box
						key={showStar}
						position='absolute'
						inset={0}
						display='flex'
						alignItems='center'
						justifyContent='center'
						pointerEvents='none'
						color='#f2b705'
						filter='drop-shadow(0 0 12px rgba(242,183,5,0.55))'
						animation={`${starPop} 1s ease-out forwards`}
					>
						<PiStarFill size={104} />
					</Box>
				)}
			</Box>
            <Box px={{ base: 3, md: 4 }}>
                <PostFooter post={post} isProfilePage={false} creatorProfile={userProfile} likeState={likeState}/>
            </Box>
        </Box>
    )
}
