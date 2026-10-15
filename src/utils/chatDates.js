// Dates in a chat: messages are grouped by day under a "Today" / "Yesterday" /
// "Monday, 13 October 2026" / "7 October 2026" header (always with the year).

const DAY_MS = 86400000;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// Whole calendar days between `date` and today (0 = today). Rounded so DST days still count as one.
const daysAgo = (date) => Math.round((startOfDay(new Date()) - startOfDay(date)) / DAY_MS);

export const dayLabel = (value) => {
	const date = new Date(value);
	const days = daysAgo(date);
	if (days === 0) return "Today";
	if (days === 1) return "Yesterday";
	if (days > 1 && days < 7) return date.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" });
	return date.toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" });
};

export const timeLabel = (value) => new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// Hover text on a message: "Wednesday 15 October 2026, 14:05"
export const fullDateTime = (value) =>
	new Date(value).toLocaleString([], { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

// [{ key, date, items }] in message order, one entry per calendar day.
export const groupByDay = (messages) => {
	const groups = [];
	messages.forEach((m) => {
		const date = new Date(m.timestamp);
		const key = startOfDay(date).toDateString();
		const last = groups[groups.length - 1];
		if (last?.key === key) last.items.push(m);
		else groups.push({ key, date, items: [m] });
	});
	return groups;
};
