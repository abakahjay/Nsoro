import { useEffect, useState } from "react";
import { Text } from "@chakra-ui/react";
import { WEB_BUILD, androidAppVersion, androidAppVersionName, desktopAppVersion, getLatestVersions } from "../../utils/appVersion";

// "Nsoro web 2026-10-17 (abc1234) · Android app 3.0.5 (latest)", shown in the More
// menu, the right-hand footer and your own profile, so it's always clear which
// version is running and whether an update is out.
export default function AppVersion(props) {
	const [latest, setLatest] = useState(null);
	useEffect(() => {
		let live = true;
		getLatestVersions().then((v) => live && setLatest(v));
		return () => {
			live = false;
		};
	}, []);

	const parts = [`Nsoro web ${WEB_BUILD}`];
	const android = androidAppVersionName(latest);
	if (android) {
		const behind = latest?.android && Number(latest.android.versionCode) > androidAppVersion();
		parts.push(`Android app ${android}${latest?.android ? (behind ? ` · ${latest.android.versionName} available` : " (latest)") : ""}`);
	}
	const desktop = desktopAppVersion();
	if (desktop) {
		const newest = latest?.windows?.version;
		parts.push(`Windows app ${desktop}${newest ? (newest === desktop ? " (latest)" : ` · ${newest} available`) : ""}`);
	}

	return (
		<Text fontSize='xs' color='nsoro.secondary' data-testid='app-version' {...props}>
			{parts.join(" · ")}
		</Text>
	);
}
