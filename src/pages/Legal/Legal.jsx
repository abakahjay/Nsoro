import { Box, Container, Heading, Link, ListItem, Text, UnorderedList } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";

// /privacy and /terms. Public pages, linked from sign-up (age + terms checkbox),
// the auth page footer and the More menu.
const UPDATED = "24 October 2026";
const CONTACT = "abakahjoshua358@gmail.com";

const Section = ({ title, children }) => (
	<Box mb={7}>
		<Heading as='h2' size='md' mb={3}>{title}</Heading>
		<Box color='gray.300' lineHeight='1.8' sx={{ p: { mb: 3 } }}>{children}</Box>
	</Box>
);
const Mail = () => <Link href={`mailto:${CONTACT}`} color='brand.400'>{CONTACT}</Link>;

function Privacy() {
	return (
		<>
			<Heading size='xl' mb={2}>Privacy Policy</Heading>
			<Text color='gray.500' mb={8}>Last updated {UPDATED}</Text>

			<Section title='Who we are'>
				<Text>Nsoro is a photo and video social app built in Ghana by Abakah Joshua, at nsoro-app.onrender.com and as Android, Windows and installable apps. Your Nsoro account is the same account you use for GH-GPT. Questions: <Mail />.</Text>
			</Section>

			<Section title='What we collect'>
				<UnorderedList spacing={2}>
					<ListItem><b>Account details:</b> name, username, email address, a hashed password (or your Google name, email and photo if you sign in with Google), your bio and profile photo.</ListItem>
					<ListItem><b>What you post:</b> photos, videos, captions, Moments, comments, likes, saves and follows. Posts and Moments are visible to other people on Nsoro; anyone with a post&apos;s link can view that post.</ListItem>
					<ListItem><b>Messages and calls:</b> the messages you send and receive, and the signalling needed to connect voice and video calls. We do not record or store call audio or video.</ListItem>
					<ListItem><b>Notifications:</b> if you allow them, a push subscription for each device so we can alert you about messages, calls and activity.</ListItem>
					<ListItem><b>Reports:</b> if you report a post, the reason and details you give.</ListItem>
				</UnorderedList>
				<Text mt={3}>We don&apos;t sell your data, show ads, or use tracking cookies.</Text>
			</Section>

			<Section title='How we use it'>
				<Text>To run Nsoro: show your posts and profile, deliver messages, calls and notifications, keep the service safe (including reviewing reported posts), and send you important account emails. You can turn off non-essential emails in the app or with the link in any email.</Text>
			</Section>

			<Section title='Where it is stored'>
				<Text>Data, photos and videos are stored in a MongoDB Atlas database and served from Render. Connections use HTTPS and passwords are hashed. Google is used only if you choose Google sign-in.</Text>
			</Section>

			<Section title='Your choices'>
				<UnorderedList spacing={2}>
					<ListItem>Delete any of your posts at any time.</ListItem>
					<ListItem>Delete your whole account in <b>Settings → App permissions → Delete account</b>. This removes your Nsoro and GH-GPT account and everything in it.</ListItem>
					<ListItem>Turn notifications, camera and microphone access on or off in your device settings or on the App permissions page.</ListItem>
				</UnorderedList>
			</Section>

			<Section title='Children'>
				<Text>You must be 13 or older to use Nsoro. We delete accounts we learn belong to children under 13. If you are under 18, use Nsoro with a parent&apos;s or guardian&apos;s permission.</Text>
			</Section>

			<Section title='Changes'>
				<Text>We&apos;ll update this page if our practices change and show the new date at the top.</Text>
			</Section>
		</>
	);
}

function Terms() {
	return (
		<>
			<Heading size='xl' mb={2}>Terms of Use</Heading>
			<Text color='gray.500' mb={8}>Last updated {UPDATED}</Text>

			<Section title='Using Nsoro'>
				<Text>Nsoro is free. By creating an account you agree to these terms and to our <Link as={RouterLink} to='/privacy' color='brand.400'>Privacy Policy</Link>. You must be <b>13 or older</b>; if you are under 18, you need a parent&apos;s or guardian&apos;s permission.</Text>
			</Section>

			<Section title='What you can post'>
				<UnorderedList spacing={2}>
					<ListItem>Only post photos and videos you took or have the right to share. Don&apos;t post other people&apos;s work without permission.</ListItem>
					<ListItem>No nudity or sexual content, nothing involving minors, no harassment, threats, hate, violence or illegal content, and no spam or impersonation.</ListItem>
					<ListItem>You keep ownership of what you post. You give us permission to store it and show it to other people on Nsoro so the service works. You can delete it at any time.</ListItem>
				</UnorderedList>
			</Section>

			<Section title='Reporting posts'>
				<Text>Use <b>Report</b> on any post that breaks these rules. Our team reviews reports, removes posts that break them, and suspends accounts that keep doing so.</Text>
			</Section>

			<Section title='Copyright complaints'>
				<Text>If a post copies your work, use <b>Report → Copyright</b> on it, or email <Mail /> with: a link to the post, the work you own, your name and contact details, and a statement that you believe in good faith the use is not authorised and that your complaint is accurate. We remove infringing posts promptly and close the accounts of repeat infringers. If you believe your post was removed by mistake, email us to ask us to review it.</Text>
			</Section>

			<Section title='Your account'>
				<Text>Keep your password private. Don&apos;t try to access other people&apos;s accounts or data or disrupt the service. We may suspend accounts that break these terms. You can delete your account at any time.</Text>
			</Section>

			<Section title='No guarantee'>
				<Text>Nsoro is provided as it is. We may change, pause or stop features at any time.</Text>
			</Section>

			<Section title='Contact'>
				<Text><Mail /></Text>
			</Section>
		</>
	);
}

export default function LegalPage({ page = "privacy" }) {
	return (
		<Container maxW='3xl' px={{ base: 4, md: 8 }} py={{ base: 8, md: 14 }}>
			{page === "terms" ? <Terms /> : <Privacy />}
		</Container>
	);
}
