# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**Nsoro** (Twi *nsoromma*, "star"): a photo/video social app. Frontend: React 18 + Vite (JavaScript/JSX, no TypeScript), Chakra UI for all styling, Zustand for state. It is a pure client. All data comes from a separate Express backend (not in this repo) reached through `VITE_API_URL`. Deployed on Vercel. `vercel.json` rewrites every path to `/` so client-side routing works.

## Branding

The product is called **Nsoro**. It must not use Instagram's or Meta's name, logo, gradient, icons or artwork anywhere: not in the UI, and not in code comments.

- **Brand:** colours are green `#0a7a4b`, `#2f9e44` and gold `#f2b705`. The logo (deep-green tile, gold star, Ghana's black star) is `public/icons/nsoro-logo.svg` (`NsoroMark`/`NsoroLogo` in `src/assets/constants.jsx`).
- **Icon and logo images:** `node scripts/generate-icons.mjs` renders all of them with headless Chrome: the PWA/iOS/maskable icons, the favicons, `public/logo.png`, `public/auth.png` and `desktop/build/icon.png`.
- **UI icons:** Phosphor (`react-icons/pi`), wrapped in `src/assets/constants.jsx`. Use a bell for activity, two bubbles for messages and a star for liking. Never copy Instagram's SVGs.
- **API paths:** the app calls `/api/v1/nsoro/*`. The backend also still serves `/api/v1/instagram/*` for older installs.
- **Push app key:** `nsoro`. The backend migrates old `instagram` rows to it.
- **Repo and folder:** the GitHub repo is `abakahjayy/Nsoro` (renamed from `Instagram`; GitHub redirects the old URLs) and the local folder is `Nsoro`.
- **Site address:** `https://nsoro-app.onrender.com` (Render static site `nsoro-app`). Render can't rename an onrender.com address, so this is a second static site. The old site (`nsoro`, still served at `instagrammmm-z34p.onrender.com`) stays up so old links and the Android app keep working.
- **Old name kept on purpose:** the Android package id `com.instagrammmm.app` (with `assetlinks.json`). Changing it would break installed apps.

## Commands

```bash
npm run dev       # Vite dev server on port 7005 (set in vite.config.js)
npm run build     # production build to dist/
npm run preview   # serve the built app
npm run lint      # ESLint 9 flat config (eslint.config.js)
npm test          # vitest (see caveat below)
npx vitest run src/__tests__/UsernameDis.test.jsx   # single test file
```

Testing caveat: `vite.config.js` configures a `jsdom` test environment with `setupTests.js`, but `vitest`, `jsdom`, `@testing-library/react` and `@testing-library/jest-dom` are **not** in `package.json` or `node_modules`. Install them as dev dependencies before running tests. The one existing test is a placeholder.

## Environment

`.env` holds `VITE_*` variables. The one that matters is `VITE_API_URL`, the backend base URL, used by the axios instance, raw `fetch` calls and the socket.io client. Anything prefixed `VITE_` is bundled into the client, so don't put real secrets there.

## Architecture

**Backend contract.** Every call goes to REST endpoints under `/api/v1/...` (`auth`, `users`, `posts`, `comments`, `uploadFiles`). Most calls go through the shared axios instance `src/utils/api.js` (`API`), but a few components and utils call `fetch` directly with `import.meta.env.VITE_API_URL` (image fetching, create post, edit profile, suggested users). The instance attaches no auth header, so each call adds `Authorization: Bearer <token>` itself where it needs one. `src/pages/Authpage/GoogleAuth.jsx` hardcodes `http://localhost:7004` for Google OAuth.

**Auth flow.**
- `useAuthStore` (Zustand) hydrates `user` from `localStorage["user-info"]` on load.
- On mount, `App.jsx` calls `GET /api/v1/auth/dashboard` with the stored token. It then rewrites `user-info` as `{ user, token }` and calls `setAuthUser(data.user)`.
- After that, the store's `user` can be either the wrapped `{ user, token }` object or the bare user. That is why code keeps unwrapping it with `authUser.user ? authUser.user : authUser` (see `PageLayout.jsx` and `useGetFeedPosts.js`). Keep that unwrapping when you touch auth-dependent code.

**Routing.** `App.jsx` builds a `createBrowserRouter` inside the component, after the auth check finishes. Routes are `/`, `/auth`, `/:username` (profile), `/messages` and `/messages/:id`. Auth guarding is inline (`authUser ? <Page/> : <Navigate to="/auth"/>`). `components/trys/ProtectedRoute.jsx` exists but is not used. `authUser` and `onLogout` are passed down as props from `App` as well as read from the store.

**Layout.** `Layouts/PageLayouts/PageLayout.jsx` wraps every route. It shows the `SideBar` when logged in, shows the top `Navbar` when logged out (except on `/auth`), and adds a fixed portfolio badge.

**State.** There are three Zustand stores in `src/store/`:
- `useAuthStore`: the logged-in user, plus loading and error state.
- `usePostStore`: the current post list, shared by the feed and profile grids. Hooks replace it with `setPosts`.
- `userProfileStore` (exported as `useProfileStore`): the profile being viewed. Its `addPost`/`deletePost` replace `userProfile.user` with the updated user returned by the server.

Redux Toolkit, react-query, formik, styled-components and tailwind are in `package.json` but are not the active pattern. Use Zustand and Chakra.

**Data hooks.** Each backend operation has a custom hook in `src/hooks/` (`useLogin`, `useSignup`, `useGetFeedPosts`, `useGetUserPosts`, `useLikePost`, `useFollowUser`, `usePostComment`, `useEditProfile`, `useSearchUser`, and others). The pattern is: local `isLoading` state, an API call, an update to the Zustand store, and errors reported through `useShowToast()` (a Chakra toast wrapper taking `(title, description, status, duration?)`). Fetching hooks use an `AbortController` cleanup and ignore the `'canceled'` error. Put new backend interactions in a hook that follows this pattern.

**Images and videos.** Media lives in the backend's GridFS and is referenced by file id.
- A post's `postId` is the id of its file. `mediaType` (`'image'` or `'video'`, with a default of `'image'` for older posts) decides how it's rendered.
- `components/FeedPosts/PostMedia.jsx` renders every post's media, with variants `feed`, `thumb` and `full`. It builds direct URLs with `utils/media.js`: `imageUrl` uses `/posts/image/:id` and `mediaUrl` uses `/posts/media/:id`.
- Videos must use `/posts/media/:id`, because only that route supports HTTP Range requests, which are needed for seeking.
- Profile pictures still use the older blob approach: `utils/fetchImage.js`, wrapped in a hook by `utils/imageUrl.js` (`ProfileUrl`).
- Uploads are capped at 50MB for video and 10MB for images, on both client (`hooks/usePreviewing.js`, pass `{ allowVideo: true }`) and server. Every file goes into the same MongoDB, so keep the caps.

**Messaging.**
- `utils/socket.js` holds one shared socket.io connection, authenticated with the JWT that `utils/auth.js` `getAuthToken()` reads from `localStorage["user-info"].token`. The store's user object doesn't reliably include the token.
- `hooks/useChat.js` loads history over REST (`GET /api/v1/messages/:me/:other`) and then sends over the socket. It shows each message immediately, then swaps in the saved copy from the server's ack. It also handles typing events and marks messages read.
- `hooks/useConversations.js` backs the inbox (`GET /api/v1/messages/conversations`).
- Pages: `pages/Messages/Messages.jsx` is the inbox and `pages/Messages/Chat.jsx` is `/messages/:userId`. The Message button on a profile links to the chat.
- `useLogout` calls `closeSocket()`.

**Notifications, search, saved.**
- `hooks/useNotifications.js` `useNotificationsSync` is mounted once by `PageLayout`. It loads `GET /api/v1/notifications` into `store/useNotificationStore.js` and adds live `notification` socket events. The sidebar and mobile top bar read their unread badge from that store, and `/notifications` marks everything read.
- `/search` searches people as you type (`GET /api/v1/users/search?q=`). With an empty query it shows an Explore grid of all posts.
- The profile tabs are Posts, Saved and Likes. Saved (`GET /posts/saved`, auth) appears only on your own profile; Likes uses `GET /posts/liked/:userId`.
- The bookmark in `PostFooter` goes through `hooks/useSavePost.js`, which mirrors `saved` onto the store's user.
- `components/Profile/PostGrid.jsx` is the shared 3-column grid plus full-post modal. It has no delete button, because saved and liked posts can belong to anyone.

**Responsive layout.** Below the `md` breakpoint, `PageLayout` hides the sidebar and renders `components/NavBar/MobileNav.jsx` instead: a top bar and a fixed bottom tab bar. The bottom bar is hidden inside an open chat, and phones log out from their own profile header. `FeedPost` handles double-tap-to-like with its own tap timer, not `onDoubleClick`, so it also works on touch.

**Moments (stories), share links.**
- Stories are called **Moments** everywhere a user sees them. The code and API keep the name "stories".
- `components/Stories/StoriesBar.jsx` is a card at the top of the feed with rounded-square tiles and a gold ring. It uses `hooks/useStories.js` (`/api/v1/stories`).
- `StoryViewer.jsx` is the full-screen player: photos last 5 s via requestAnimationFrame, videos report their own progress, tap left or right to move, and holding pauses.
- Reels were removed on purpose, because they were an Instagram signature. Videos are ordinary posts, and `/reels` redirects to `/`.
- `/p/:postId` is a public single-post page. `utils/share.js` uses the native share sheet and falls back to copying the link.

**Breakpoints.** Phones (base) get MobileNav; tablets (md–lg) get a 72px icon rail; `xl` and up get the 240px sidebar with labels. Every `SideBar/*` item switches between collapsed and labelled at `xl`, not `md`, and PageLayout sets the rail width to match.

**Installable app / downloads.**
- The `/download` page detects the device and puts that device's option first.
- **Android:** a signed Trusted Web Activity APK (`com.instagrammmm.app`) at `public/downloads/Nsoro.apk`, made with PWABuilder's packaging service. The app inside still shows the old name and icon until it is rebuilt with the same signing key. `public/.well-known/assetlinks.json` must match the signing key. The key lives in Desktop\Other\"Instagram App Packages" on the owner's PC and is never committed.
- **Windows:** `Nsoro-Setup.exe` (appId `com.nsoro.app`) is built from `desktop/` (Electron + electron-builder NSIS; `npm run dist`) and published as a GitHub Release asset on abakahjayy/Nsoro. The page links to `/releases/latest/download/Nsoro-Setup.exe`. The app window loads the live site and uses a plain Chrome user agent, because Google blocks sign-in from "Electron".
- **iPhone, iPad and Mac:** installed from the browser as a PWA. The manifest is in `vite.config.js`, the icons come from `scripts/generate-icons.mjs`, and `utils/install.js` catches `beforeinstallprompt` for the "install from this browser" button.
- Links on the page use the public site address, never `window.location` (it showed localhost during local runs).
- **Building the .exe on Windows** fails when unpacking winCodeSign's macOS symlinks without admin rights. Fix it by extracting the archive into the electron-builder cache as `winCodeSign-2.6.0`, ignoring the symlink errors.
- "Get the app" links: the sidebar, the phone feed banner, the auth page and the suggested-users footer. All are hidden inside the installed app.

**Sidebar height.** `SideBar.jsx` sets its spacing with CSS variables that shrink at `max-height` 800px and 650px, and it scrolls as a last resort, so "Get the app" and Logout stay reachable on short laptop screens.

**Messages extras.**
- `useChat` handles live `messageUpdated` and `messageDeleted` socket events, plus edit (PATCH `/messages/:id/edit`), unsend (DELETE `/messages/:id`) and voice notes (POST `/messages/voice`, multipart field `audio`).
- `useVoiceRecorder` picks webm/opus or mp4 (Safari) and caps a note at 60 s.
- Your own messages have a menu that opens on hover (the "⋯" button), long-press or right-click.
- The chat groups messages by day under sticky "Today" / "Yesterday" / weekday / date headers (`utils/chatDates.js`). Tapping a message shows its full sent time.
- `useChat` and `useInboxSync` treat the open chat as read immediately, and `useChat` fires `inbox:refresh` after your own send, edit or unsend. The server never echoes your own messages back to the tab that sent them.

**Voice and video calls.**
- Calls are WebRTC between the two browsers. `utils/call.js` holds the peer connection and actions (`startCall`, `acceptCall`, `hangUp`, …), and `store/useCallStore.js` holds the state.
- `hooks/useCallSync.js` (mounted by PageLayout) binds the socket events. `components/Call/CallScreen.jsx` is the full-screen UI, also mounted in PageLayout so a call survives navigation.
- Signaling is FullBackendd `utils/socket.js`: `call:invite` / `incoming` / `accept` / `accepted` / `decline` / `end` / `ended` / `signal`. Calls ring for 35 s.
- When a call ends, the server saves a `type: 'call'` message (`callKind`, `callStatus`, `duration`) that shows in the chat and inbox.
- **Tones** are synthesized in `utils/call.js` (no audio files). They are original sounds, not copies of another app's: the ringback is a soft low swell every 3 s, and the incoming ring is a marimba phrase (E5 G5 C6 G5) every 2.4 s plus vibration.
- **Incoming call with the app open:** the call screen takes over whatever page you're on and rings.
- **App in the background or closed:** the push is a call notification (`public/push-sw.js`) with `requireInteraction`, a long vibration and **Answer** / **Decline** buttons.
  - The service worker skips that notification when an app window is focused.
  - **Ringing in the background:** a web app can't loop a ringtone, so `ringUntilAnswered()` in `push-sw.js` re-shows the notification every 4 s (each re-show plays the phone's notification sound and vibrates). It runs for up to 35 s and asks `POST /api/v1/push/call-status` each time whether the call is still ringing. It stops when the call is answered, declined or over, when the notification is swiped away, or when the app comes to the front.
  - Call pushes have a 35 s TTL, so a phone that was offline never rings for a finished call.
  - Decline posts the ringing receipt to `POST /api/v1/push/call-decline`.
  - Answer focuses the open app and posts `call-answer` to it (`useCallSync` → `answerFromNotification`), or opens `/messages/<caller>?answer=<callId>`, which answers as soon as the call rings in the app.
  - `call.js` closes the call's notification once it's answered, declined or over.
- **Missed calls** are added to the Notifications list (`type: 'call'`, text `audio`/`video`) with a call-back button.
- The caller sees "Calling…" until the callee's device confirms, then "Ringing…". The open app confirms with `call:ringing`; with the app closed, the service worker posts the push receipt.
- Only public STUN is configured. Callers behind strict NATs need a TURN server via `VITE_TURN_URL`, `VITE_TURN_USERNAME` and `VITE_TURN_CREDENTIAL`.

**Ticks (read receipts).**
- One grey tick means sent. Two grey ticks mean `deliveredAt` is set (the recipient's app was open, or a push reached their phone). Blue ticks mean `read`, and "Seen" appears under the newest read message.
- The server emits `messagesDelivered` and `messagesRead` `{ by, at }`. `useChat` keeps them as "up to this time" values in `receipts`, so a receipt that arrives before the send ack still counts.
- Push receipts: FullBackendd `utils/pushAck.js` signs a short-lived token into each message/call push. `public/push-sw.js` posts it to `POST /api/v1/push/ack`, which needs no login.

**Video playback.**
- Always start videos with `playVideo()` from `utils/media.js`. Phones refuse to start a video with sound without a fresh tap; `playVideo()` then plays it muted and returns `"muted"` so the UI shows "Unmute".
- A bare `video.play().catch(() => {})` left videos frozen on Android once sound was on.

**Emails.** The email on/off switch is in EditProfile (PATCH `/api/v1/nsoro/settings/email`). `/admin/updates` sends an app-update email to everyone; it's only for `user.role === "admin"`, set with the backend's `scripts/makeInstagramAdmin.js`.

**Look and layout.** The design must not resemble Instagram.
- **Colours** (theme in `main.jsx`):
  - `nsoro.*` page tokens: `bg` #0a1210 (deep forest green-black), `surface`, `raised`, `border`, `text`, `secondary`, `link` (gold).
  - `brand.*`: emerald. Use `colorScheme='brand'`; its solid buttons are emerald with white text.
  - `gold.*`: accent.
  - Don't use blue, `whiteAlpha` greys or "black" for app chrome. Media areas (photos, videos, moments) stay black.
- **Shapes:**
  - Avatars are rounded squares (theme `Avatar` plus a global `.chakra-avatar__img` rule).
  - Feed posts, the Moments tray, the right column and the profile header are rounded cards on `nsoro.surface`. On phones they are full width.
  - Grids have gaps and rounded tiles.
- **Stars, not likes:** the like button is a star (`LikeLogo`/`UnlikeLogo`), double-tap pops a gold star, the profile tab says "Starred" and notifications say "starred your post". The API still calls them likes.
- **Sidebar:**
  - It sits on `nsoro.surface`. Items are `NavLink`s, and the current page gets a green tint plus a gold left bar (styled in `SideBar.jsx`).
  - Order: Home, Messages (unread badge from `store/useInboxStore`, kept fresh by `useInboxSync`), Search, Notifications, Create, Profile.
  - The ☰ More menu (`SideBar/MoreMenu.jsx`) holds Saved, Get the app, Send an update for admins, About and Log out.
- **Phones:** the bottom bar is Home, Search, Create, Notifications, Profile; the current tab is gold. Messages is in the top bar.
- **Profile:** a card with an emerald-to-gold banner, the avatar overlapping it, full name then @username, bio and count chips. The tabs are a segmented control: Posts · Saved (owner only) · Starred.
- **Right column:** a "People to follow" card with your account, suggestions with "Followed by …", and the footer links. There is no "Switch" and no floating Messages pill (both were Instagram signatures).
- **Messages:** `pages/Messages/Messages.jsx` handles both `/messages` and `/messages/:id`. It is two-pane (inbox plus chat) on tablets and up and one screen at a time on phones, and has a New message search modal.
- **Unread updates:** `useChat` dispatches a window `inbox:refresh` event after marking a conversation read.
- **Security:** API calls send the login token through an axios interceptor (`utils/api.js`). Social actions use the backend's logged-in `/api/v1/nsoro/*` routes.
- **Security headers** (CSP, X-Frame-Options, etc.) are set in Render → nsoro-app (and the old site, nsoro) → Headers. The CSP only allows `fullbackendd.onrender.com` for API, socket and media calls, so a new backend or media host must be added there.

 `main.jsx` sets up the Chakra theme (dark mode by default, `nsoro.bg` body background) and registers `/sw.js`. `vite.config.js` also configures `vite-plugin-pwa`.

## Dead or legacy code

- `src/components/trys/` holds experiments. `PageLayout` imports `Footer.jsx` but never renders it.

## Device notifications (Web Push)

`public/push-sw.js` is loaded into the generated service worker (`workbox.importScripts` in vite.config.js). `src/utils/push.js` subscribes this device with app `nsoro` through FullBackendd `/api/v1/push`. The switch is `components/Profile/PushNotificationsToggle.jsx`, under Email notifications in Edit profile. `App.jsx` calls `syncPushSubscription()` after the dashboard refresh.

The backend pushes every like, comment, follow and DM, plus welcome and sign-in emails. The service worker hides a notification while the app is focused. On iPhone and iPad it only works once the app is on the Home Screen.
