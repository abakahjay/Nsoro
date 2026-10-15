import { Avatar, Box, Button, Flex, Text, useDisclosure } from "@chakra-ui/react";
import EditProfile from "./EditProfile";
import { avatarUrl } from "../../utils/media";
import useAuthStore from "../../store/useAuthStore";
import useFollowUser from "../../hooks/useFollowUser";
import useShowToast from "../../hooks/useShowToast";
import { Link as RouterLink } from "react-router-dom";

// Profile card: green-gold banner, rounded-square avatar overlapping it, full name
// then @username, bio, counts as chips. Phones: buttons full width at the bottom.
export default function ProfileHeader({authUser,onLogout,username,owner}) {
      const user=authUser.user?authUser.user:authUser
      const url = avatarUrl(user);
      const UseAuth = useAuthStore((state) => state.user);
      const { isFollowing, isUpdating, handleFollowUser } = useFollowUser(user._id);
      const visitingOwnProfileAndAuth = !!UseAuth && user && user.username === owner;
      const visitingAnotherProfileAndAuth = !!UseAuth && user && user.username !== owner;
      const { isOpen, onOpen, onClose } = useDisclosure();
      const showToast = useShowToast();
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");

      const shareProfile = async () => {
        const link = `${window.location.origin}/${user.username}`;
        try {
          if (navigator.share) await navigator.share({ title: `${user.username} on Nsoro`, url: link });
          else {
            await navigator.clipboard.writeText(link);
            showToast("Profile link copied", "", "success", 1500);
          }
        } catch { /* share sheet dismissed */ }
      };

      const stats = [
        { label: "posts", value: user.posts.length },
        { label: "followers", value: user.followers.length },
        { label: "following", value: user.following.length },
      ];

      const buttonProps = { size: "sm", flex: { base: 1, md: "initial" }, borderRadius: "lg", fontWeight: "semibold" };
      const buttons = (
        <Flex gap={2} w={{ base: "full", md: "auto" }}>
          {visitingOwnProfileAndAuth && (
            <>
              <Button {...buttonProps} bg='nsoro.raised' border='1px solid' borderColor='nsoro.border' _hover={{ bg: "nsoro.hover" }} onClick={onOpen}>
                Edit profile
              </Button>
              <Button {...buttonProps} bg='nsoro.raised' border='1px solid' borderColor='nsoro.border' _hover={{ bg: "nsoro.hover" }} onClick={shareProfile}>
                Share profile
              </Button>
              {user.role === "admin" && (
                <Button {...buttonProps} as={RouterLink} to='/admin/updates' bg='nsoro.raised' border='1px solid' borderColor='nsoro.border' _hover={{ bg: "nsoro.hover" }}>
                  Send update
                </Button>
              )}
              {/* Phones have no sidebar, so logout lives here. */}
              <Button {...buttonProps} display={{ base: "inline-flex", md: "none" }} variant='outline' onClick={() => onLogout?.(user._id)}>
                Log out
              </Button>
            </>
          )}
          {visitingAnotherProfileAndAuth && (
            <>
              <Button
                {...buttonProps}
                bg={isFollowing ? "nsoro.raised" : "brand.500"}
                color={isFollowing ? undefined : "white"}
                _hover={{ bg: isFollowing ? "nsoro.hover" : "brand.600" }}
                onClick={handleFollowUser}
                isLoading={isUpdating}
              >
                {isFollowing ? "Following" : "Follow"}
              </Button>
              <Button {...buttonProps} as={RouterLink} to={`/messages/${user._id}`} bg='nsoro.raised' border='1px solid' borderColor='nsoro.border' _hover={{ bg: "nsoro.hover" }}>
                Message
              </Button>
            </>
          )}
        </Flex>
      );

  return (
    <Box w='full' bg='nsoro.surface' border='1px solid' borderColor='nsoro.border' borderRadius='2xl' overflow='hidden'>
      {/* Nsoro banner: emerald into gold, with a faint star */}
      <Box
        h={{ base: "84px", md: "120px" }}
        bgGradient='linear(120deg, brand.800, brand.500 55%, gold.500)'
        position='relative'
        _after={{ content: '"★"', position: "absolute", right: { base: 4, md: 8 }, top: { base: 2, md: 3 }, fontSize: { base: "40px", md: "56px" }, color: "whiteAlpha.300", lineHeight: 1 }}
      />

      <Box px={{ base: 4, md: 8 }} pb={{ base: 4, md: 6 }}>
        <Flex gap={{ base: 4, md: 6 }} alignItems='flex-end' mt={{ base: "-40px", md: "-60px" }} wrap='wrap'>
          <Avatar
            src={url}
            name={user.username}
            alt={`${user.username}'s profile picture`}
            referrerPolicy='no-referrer'
            w={{ base: "88px", md: "128px" }}
            h={{ base: "88px", md: "128px" }}
            boxShadow='0 0 0 4px var(--chakra-colors-nsoro-surface)'
            flexShrink={0}
          />
          <Box flex={1} minW='160px' pb={1}>
            <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight='bold' lineHeight='short' noOfLines={1}>
              {fullName || username}
            </Text>
            <Text color='nsoro.secondary' fontSize='sm' noOfLines={1}>
              @{username}
            </Text>
          </Box>
          <Box display={{ base: "none", md: "block" }} pb={1}>{buttons}</Box>
        </Flex>

        {user.bio && (
          <Text fontSize='sm' whiteSpace='pre-wrap' mt={4} maxW='60ch'>
            {user.bio}
          </Text>
        )}

        {/* counts as chips */}
        <Flex gap={2} mt={4} wrap='wrap'>
          {stats.map((s) => (
            <Flex key={s.label} alignItems='baseline' gap={1.5} bg='nsoro.raised' border='1px solid' borderColor='nsoro.border' borderRadius='xl' px={3} py={1.5}>
              <Text fontWeight='bold'>{s.value}</Text>
              <Text color='nsoro.secondary' fontSize='sm'>{s.label}</Text>
            </Flex>
          ))}
        </Flex>

        {/* phones: buttons full width under the counts */}
        <Box display={{ base: "block", md: "none" }} mt={4}>
          {buttons}
        </Box>
      </Box>

      {isOpen && <EditProfile isOpen={isOpen} onClose={onClose}/>}
    </Box>
  )
}
