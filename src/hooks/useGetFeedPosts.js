import { useEffect, useState } from "react";
import usePostStore from "../store/usePostStore";
import useAuthStore from "../store/useAuthStore";
import useShowToast from "./useShowToast";
import useUserProfileStore from "../store/userProfileStore";
import API from "../utils/api";

const useGetFeedPosts = () => {
	const [isLoading, setIsLoading] = useState(true);
	const { posts, setPosts } = usePostStore();
	const authUser = useAuthStore((state) => state.user);
	const showToast = useShowToast();
	const { setUserProfile } = useUserProfileStore();
	const user=authUser.user?authUser.user:authUser

  // console.log(authUser)

	useEffect(() => {
		const getFeedPosts = async () => {
			setIsLoading(true);
			// Everyone gets every post, ranked for them like other social apps (fresh, popular,
			// people you follow or engage with first). It used to be empty for anyone who
			// didn't follow people yet.
			try {
				// ranked for this person (FullBackendd utils/nsoroFeed.js); plain newest-first as a fallback
				const response = await API.get(`/api/v1/nsoro/feed`).catch(() => API.get(`/api/v1/posts`))
        // console.log(response.data)
        const posts = response.data.posts
        // console.log(posts)

				setPosts(posts);
			} catch (error) {
				const message = error.response?.data?.error || error.message
			  showToast("Error", message, "error");
			} finally {
				setIsLoading(false);
			}
		};

		if (user) getFeedPosts();
	}, [authUser, showToast, setPosts, setUserProfile]);

	return { isLoading, posts };
};

export default useGetFeedPosts;
