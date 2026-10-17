import CreatePost from "./CreatePost";
import Home from "./Home";
import Notifications from "./Notifications";
import ProfileLink from "./ProfileLink";
import Search from "./Search";
import Messages from './MessagesLink'
import Watch from "./Watch";

// Left rail order: Home, Watch, Messages, Search, Notifications, Create, Profile.
const SidebarItems = ({authUser,onLogout}) => {
	return (
		<>
			<Home authUser={authUser} onLogout={onLogout} />
			<Watch />
			<Messages authUser={authUser} onLogout={onLogout}/>
			<Search authUser={authUser} onLogout={onLogout}/>
			<Notifications authUser={authUser} onLogout={onLogout}/>
			<CreatePost authUser={authUser} onLogout={onLogout}/>
			<ProfileLink authUser={authUser} onLogout={onLogout} />
		</>
	);
};

export default SidebarItems;
