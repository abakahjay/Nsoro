import useAuthStore from "../store/useAuthStore";
import API from "../utils/api";
import { closeSocket } from "../utils/socket";
import useShowToast from "./useShowToast"; // Custom toast hook (if you have one)

const useLogout = () => {
    const showToast = useShowToast(); // Show toast notifications
    const logoutUser = useAuthStore((state) => state.logoutUser); // Zustand store action for login
    const setError = useAuthStore((state) => state.setError); // Zustand action to handle errors
    const isLoading = useAuthStore((state) => state.isLoading); // Zustand loading state
    const error = useAuthStore((state) => state.error); // Zustand error state

    const setAuthUser= useAuthStore((state)=> state.setAuthUser)

    const logout = async (userId) => {
        
        if (!userId) {
            return showToast("Error", "You are not authorized to logout this user", "error");
        }
        // Logging out is local: the token lives only on this device, and the server's
        // /logout just clears a cookie. So sign out here first and tell the server after;
        // a slow or failed request (Render waking up, a weak phone signal) used to leave
        // you signed in with a "Logout failed" error.
        closeSocket(); // the socket is authenticated as this user
        logoutUser(); // clears localStorage and the store
        setAuthUser(null);
        setError(null);
        showToast("Success", "You're logged out", "success");
        API.post(`/api/v1/auth/logout?userId=${userId}`).catch(() => {});
    };

    return { logout, isLoading, error };
};

export default useLogout;
