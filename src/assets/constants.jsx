import {
	PiBellBold,
	PiChatCircleBold,
	PiChatsCircleBold,
	PiMagnifyingGlassBold,
	PiPlusCircleBold,
	PiStarBold,
	PiStarFill,
} from "react-icons/pi";

// Nsoro brand marks. The artwork lives in public/icons/nsoro-logo.svg
// (made by scripts/generate-icons.mjs with the app icons: deep green tile, gold star,
// Ghana's black star in the middle).
export const NsoroMark = ({ size = 24 }) => (
	<img src='/icons/nsoro-logo.svg' width={size} height={size} alt='Nsoro' style={{ borderRadius: "28%", display: "block" }} />
);

export const NsoroLogo = () => (
	<span role='img' aria-label='Nsoro' style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
		<NsoroMark size={28} />
		<span style={{ fontWeight: 800, fontSize: 24, letterSpacing: "-0.03em", color: "rgb(245, 245, 245)", lineHeight: 1 }}>Nsoro</span>
	</span>
);

// App icons: Phosphor's rounded set, Nsoro's own look (a bell for activity, two
// bubbles for messages, a star for liking - "Nsoro" means star). Same names everywhere they're used.
const icon = (Icon, label) => {
	const NsoroIcon = ({ size = 24 }) => <Icon size={size} aria-label={label} role='img' color='rgb(245, 245, 245)' />;
	NsoroIcon.displayName = `${label.replace(/\s/g, "")}Icon`;
	return NsoroIcon;
};

export const SearchLogo = icon(PiMagnifyingGlassBold, "Search");
export const MessagesLogo = icon(PiChatsCircleBold, "Messages");
export const NotificationsLogo = icon(PiBellBold, "Notifications");
export const CreatePostLogo = icon(PiPlusCircleBold, "Create");
export const CommentLogo = icon(PiChatCircleBold, "Comment");
export const LikeLogo = icon(PiStarBold, "Star");
export const UnlikeLogo = ({ size = 24 }) => <PiStarFill size={size} aria-label='Unstar' role='img' color='#f2b705' />;
