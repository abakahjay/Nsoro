import { useEffect, useState } from "react";
import useAuthStore from "../store/useAuthStore";
import useProfileStore from "../store/userProfileStore";
import useShowToast from "./useShowToast";
import API from "../utils/api";
const useFollowUser = (userId) => {
	const [isUpdating, setIsUpdating] = useState(false);
	const [isFollowing, setIsFollowing] = useState(false);
	const authUser = useAuthStore((state) => state.user);
	const setAuthUser = useAuthStore((state) => state.setAuthUser);
	const { userProfile, setUserProfile } = useProfileStore();
	const showToast = useShowToast();
    // null when logged out: profiles and post links stay viewable, and this hook runs
    // on them (logging out from your own profile used to crash the page here)
    const user=authUser?.user?authUser.user:authUser
    const showingThisProfile = String(userProfile?.user?._id) === String(userId)
    // authUser._id&&console.log(authUser?._id)
    // console.log(userId)

	const handleFollowUser = async () => {
        if (!user) return showToast("Error", "You must be logged in to follow someone", "error");
        setIsUpdating(true);
		try {
            
            // console.log(authUser)
            // console.log('userId:',userId)
            if (isFollowing) {
                // unfollow
                const datas=await API.patch(`/api/v1/nsoro/users/${userId}/unfollow`)
                const frs=await datas.data
                console.log(frs)
                if(frs.error){
                    throw new Error(frs.error)
                }
                // console.log(frs)
				setAuthUser({
                    ...user,
					following: user.following.filter((uid) => uid !== userId),
				});
				// only refresh the profile page if it's this person's (not when following from a list)
				if (showingThisProfile && frs.following)
					setUserProfile({ ...userProfile, user: frs.following });
                setIsFollowing(false);

            } else {
                // follow
                const data=await API.patch(`/api/v1/nsoro/users/${userId}/follow`)
                const fr=await data.data
                if(fr.error){
                    throw new Error(fr.error)
                }
                setAuthUser({
                    ...user,
                    following: [...user.following, userId],
                });
                if (showingThisProfile && fr.following)
                    setUserProfile({ ...userProfile, user: fr.following });
                setIsFollowing(true);
			}
		} catch (error) {
			const message = error.response?.data?.error || error.message
            console.log(error)
			showToast("Error", message, "error");
		} finally {
			setIsUpdating(false);
		}
	};

	useEffect(() => {
		if (user) {
			setIsFollowing(Boolean(user.following?.includes(userId)));
            // console.log(userProfile)
            // console.log(authUser)
		}
	}, [user, userId]);

	return { isUpdating, isFollowing, handleFollowUser };
};

export default useFollowUser;
