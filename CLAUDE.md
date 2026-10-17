# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**Nsoro** (Twi *nsoromma*, "star"): a photo/video social app. Frontend: React 18 + Vite (JavaScript/JSX, no TypeScript), Chakra UI for all styling, Zustand for state. It is a pure client. All data comes from a separate Express backend (not in this repo) reached through `VITE_API_URL`. Deployed on Vercel. `vercel.json` rewrites every path to `/` so client-side routing works.

## Branding

The product is called **Nsoro**. It must not use another social app's name, logo, gradient, icons or artwork anywhere: not in the UI, not in code, links or comments, and not in package ids or signing certificates. The app's earlier name is gone everywhere; never bring it back.

- **Brand:** colours are green `#0a7a4b`, `#2f9e44` and gold `#f2b705`. The logo (deep-green tile, gold star, Ghana's black star) is `public/icons/nsoro-logo.svg` (`NsoroMark`/`NsoroLogo` in `src/assets/constants.jsx`).
- **Icon and logo images:** `node scripts/generate-icons.mjs` renders all of them with headless Chrome: the PWA/iOS/maskable icons, the favicons, `public/logo.png`, `public/auth.png` and `desktop/build/icon.png`.
- **UI icons:** Phosphor (`react-icons/pi`), wrapped in `src/assets/constants.jsx`. Use a bell for activity, two bubbles for messages and a star for liking. Never copy another app's SVGs.
- **API paths:** `/api/v1/nsoro/*`.
- **Push app key:** `nsoro`.
- **Repo and folder:** the GitHub repo is `abakahjay/Nsoro` and the local folder is `Nsoro`.
- **Site address:** `https://nsoro-app.onrender.com` (Render static site `nsoro-app`). The old static site with the earlier address was deleted in October 2026.
- **Android package id:** `com.nsoro.app` from 3.0.0, signed with `nsoro-release.keystore` (owner `O=Nsoro`); `public/.well-known/assetlinks.json` lists only that package and key. Apps from before 3.0.0 had another id and key: they open in a browser window and see the update card, which downloads 3.0.0 as a new app; the download page tells people to uninstall the old one.

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
- Reels were removed on purpose, because they were another app's signature. Videos are ordinary posts, and `/reels` redirects to `/`.
- `/p/:postId` is a public single-post page. `utils/share.js` uses the native share sheet and falls back to copying the link.

**Breakpoints.** Phones (base) get MobileNav; tablets (md–lg) get a 72px icon rail; `xl` and up get the 240px sidebar with labels. Every `SideBar/*` item switches between collapsed and labelled at `xl`, not `md`, and PageLayout sets the rail width to match.

**Installable app / downloads.**
- The `/download` page detects the device and puts that device's option first.
- **Android:** a signed Trusted Web Activity APK (`com.nsoro.app`) at `public/downloads/Nsoro.apk`, opening `nsoro-app.onrender.com`. The current version is 3.0.2 (versionCode 9). The project was generated by Bubblewrap and lives in `android-tools\nsoro-twa`; it uses Java 17 and the Android SDK in `C:\Users\DELL\android-tools`. It now carries hand edits (Android TV, call ringing and the full-screen call screen, see **TVs** and **Voice and video calls**), so **don't run `bubblewrap update`**, because it regenerates those files. To ship a new version:
  1. Bump `versionCode`/`versionName` in `app/build.gradle`, **and** `android` in `public/downloads/version.json`. That file drives in-app updates, so bump it only once the new APK is in `public/downloads/`.
  2. Run `gradlew assembleRelease` with `JAVA_HOME` and `ANDROID_HOME=C:/Users/DELL/android-tools/sdk` set.
  3. Run `zipalign -p 4`, then `apksigner sign` with `Desktop/Other/Nsoro App Packages/android/nsoro-release.keystore`. The passwords are in `signing-key-info.txt` beside it (the old app's key and builds are in `retired-old-app/`); pass them with `--ks-pass env:…`.
  4. Copy the result to `public/downloads/Nsoro.apk`. It must be signed with the same key: `public/.well-known/assetlinks.json` has to match it. The key lives in that folder on the owner's PC and is never committed.
- **In-app updates** (`public/downloads/version.json` `{ android: { versionCode, versionName, url }, windows: { version, url } }`):
  - Android: `LauncherActivity` opens the site with `?app_version=<versionCode>`. `utils/appVersion.js` stores it (and marks the visit as opened by the app). `AppBanners` shows "Update available" only in the app's window and only when version.json is newer. On 3.0.0+ the button opens `nsoro://update` (`UpdateActivity`: downloads the APK into the cache with a progress bar and hands it to the installer, asking for "Install unknown apps" if needed). Older apps just download the 3.0.0 APK.
  - Windows (from 2.3.0): `desktop/main.js` `checkForUpdate()` reads `windows.version` after the page loads, asks "Update now / Later", downloads the installer from the release URL (taskbar progress), runs it and quits.
  - Website, iPhone/iPad/Mac and ChromeOS apps always run the latest site (service worker `autoUpdate`), so they need nothing.
- **Windows:** `Nsoro-Setup.exe` (appId `com.nsoro.app`) is built from `desktop/` (Electron + electron-builder NSIS; `npm run dist`) and published as a GitHub Release asset on abakahjay/Nsoro. The page links to `/releases/latest/download/Nsoro-Setup.exe`. The app window loads the live site and uses a plain Chrome user agent, because Google blocks sign-in from "Electron".
- **iPhone, iPad and Mac:** installed from the browser as a PWA. The manifest is in `vite.config.js`, the icons come from `scripts/generate-icons.mjs`, and `utils/install.js` catches `beforeinstallprompt` for the "install from this browser" button.
- Links on the page use the public site address, never `window.location` (it showed localhost during local runs).
- **Building the .exe on Windows** fails when unpacking winCodeSign's macOS symlinks without admin rights. Fix it by extracting the archive into the electron-builder cache as `winCodeSign-2.6.0`, ignoring the symlink errors.
- "Get the app" links: the sidebar, the phone feed banner, the auth page and the suggested-users footer. All are hidden inside the installed app.

**TVs.**
- `utils/tvRemote.js` (imported once by `main.jsx`) turns on when it detects a TV browser (or `?tv=1` for testing). On a TV the arrow keys move focus to the nearest control in that direction, OK clicks `role="button"` boxes, and a gold outline (`html.tv :focus` in `main.jsx`) shows where focus is. Clickable `Box`/`Flex`/`Text` elements need `role="button"` and `tabIndex={0}` so the remote can reach them.
- Android TV: from 2.1.0 (versionCode 3) the APK has `android:banner="@drawable/tv_banner"` (from `public/icons/tv-banner.png`), a `LEANBACK_LAUNCHER` category, and touchscreen/leanback marked not required. These (and the call ringing in `DelegationService.java`) were edited by hand into `AndroidManifest.xml`, `DelegationService.java` and `app/build.gradle`, so build with `bubblewrap build` only. `bubblewrap update` regenerates the manifest and would drop them.
- The Windows app opens maximized on screens 2400px wide or more.

**Sidebar height.** `SideBar.jsx` sets its spacing with CSS variables that shrink at `max-height` 800px and 650px, and it scrolls as a last resort, so "Get the app" and Logout stay reachable on short laptop screens.

**Messages extras.**
- `useChat` handles live `messageUpdated` and `messageDeleted` socket events, plus edit (PATCH `/messages/:id/edit`), unsend (DELETE `/messages/:id`) and voice notes (POST `/messages/voice`, multipart field `audio`).
- `useVoiceRecorder` picks webm/opus or mp4 (Safari) and caps a note at 60 s.
- Your own messages have a menu that opens on hover (the "⋯" button), long-press or right-click.
- The chat groups messages by day under sticky "Today" / "Yesterday" / weekday / date headers (`utils/chatDates.js`). Tapping a message shows its full sent time.
- `useChat` and `useInboxSync` treat the open chat as read immediately, and `useChat` fires `inbox:refresh` after your own send, edit or unsend. The server never echoes your own messages back to the tab that sent them.

**End-to-end encryption (messages and voice notes).**
- `utils/e2e.js` (WebCrypto only). Each device has its own ECDH P-256 key pair. The private key is non-extractable and kept in IndexedDB (`nsoro-e2e`, one entry per account). The public key is registered with `PUT /api/v1/messages/keys` (by `useInboxSync` on sign-in and by `useChat`). `GET /api/v1/messages/keys/:userId` lists a user's devices, at most 10, and the least recently used are dropped.
- Sending: a fresh AES-256-GCM key encrypts the text (or the voice note's audio blob). It's wrapped with AES-KW, using a key from HKDF(ECDH(sender device, target device)), for every device of the recipient **and** of the sender. The envelope `{ v:1, sd, spk, iv, ct, keys:[{d,k}], mime? }` goes in `Message.e2e`, and `message` stays empty. Encrypted voice notes are uploaded already scrambled.
- Reading: `decryptMessage` / `decryptAll` (useChat, useConversations for inbox previews) fill in `message` and set `e2eState`: `ok`, `nokey` (sent before this device was set up, shown as a lock line, like WhatsApp on a new phone) or `error`. `VoiceNote` downloads and decrypts the audio into a `blob:` URL (the CSP allows `media-src blob:`).
- If the recipient has no registered device yet, `encryptText` returns null and the message goes as plain text, as before. If encryption *fails*, the message is not sent; never fall back to plain text on an error.
- Chat shows a lock banner when the other person can receive encrypted messages. Tapping it opens "Verify security code": 60 digits from SHA-256 over both users' device keys, the same on both phones, and it changes when a device is added.
- Pushes and emails never contain message text. Calls are WebRTC (DTLS-SRTP), so they're encrypted between the two devices already.
- Old plain-text messages stay readable. The server can't read encrypted ones, so server-side search or moderation of message text is impossible for them.

**Voice and video calls.**
- Calls are WebRTC between the two browsers. `utils/call.js` holds the peer connection and actions (`startCall`, `acceptCall`, `hangUp`, …), and `store/useCallStore.js` holds the state.
- `hooks/useCallSync.js` (mounted by PageLayout) binds the socket events. `components/Call/CallScreen.jsx` is the full-screen UI, also mounted in PageLayout so a call survives navigation.
- Signaling is FullBackendd `utils/socket.js`: `call:invite` / `incoming` / `accept` / `accepted` / `decline` / `end` / `ended` / `signal`. Calls ring for 35 s.
- When a call ends, the server saves a `type: 'call'` message (`callKind`, `callStatus`, `duration`) that shows in the chat and inbox.
- **Tones** are synthesized in `utils/call.js` (no audio files). Outgoing calls play the classic phone-line ringback (400 + 450 Hz double ring, 0.4 s on / 0.2 s off / 0.4 s on, every 3 s). The incoming ring is an original bright pluck pattern (A5 C#6 E6, then B5 E6 G#6) every 2.6 s plus vibration. Don't copy another app's ringtone.
- **Incoming call with the app open:** the call screen takes over whatever page you're on and rings.
- **App in the background or closed:** the push is a call notification (`public/push-sw.js`) with `requireInteraction`, a long vibration and **Answer** / **Decline** buttons.
  - The service worker skips that notification when an app window is focused.
  - **Ringing in the background:** a web app can't loop a ringtone, so `ringUntilAnswered()` in `push-sw.js` re-shows the notification every 4 s (each re-show plays the phone's notification sound and vibrates). It runs for up to 35 s and asks `POST /api/v1/push/call-status` each time whether the call is still ringing. It stops when the call is answered, declined or over, when the notification is swiped away, or when the app comes to the front.
    - **In the Android app** (from 2.1.0), Android ignores the sound and vibration a website asks for, so `DelegationService.java` in the TWA project spots the incoming-call notification (it has an "Answer…" button) and re-posts it on its own "Incoming calls" channel. That channel uses high importance, the phone's ringtone (ringer volume) and `FLAG_INSISTENT`, so it rings and vibrates continuously until the service worker closes it (or 45 s pass). The "Missed call" notification has no buttons and stays quiet. Keep the "Answer" action titles in `push-sw.js`, because the app matches on them.
    - **Full-screen call screen** (from 2.2.0): on the first show of each call, `DelegationService` adds a full-screen intent that opens `IncomingCallActivity` (permission `USE_FULL_SCREEN_INTENT`). It shows over the lock screen and turns the screen on, with the caller's name and round **Decline** / **Answer** buttons. Those fire the notification's own action PendingIntents, so `push-sw.js` handles them as usual, and Answer also asks to unlock the phone. The screen closes when the notification goes away. With the phone unlocked, Android shows the ringing heads-up notification instead. On Android 14+ the user can turn full-screen intents off for the app, and then it only rings. The notification body still answers on tap, so never use the notification's content intent as the full-screen intent.
    - **Ringtone** (from 2.3.0): the app plays its own ringtone, `res/raw/nsoro_ring.ogg` (original, the same notes as the in-app ring, made with a small Python synth), through `CallRinger` (MediaPlayer, USAGE_NOTIFICATION_RINGTONE, looping, plus vibration). It respects silent/vibrate mode and Do Not Disturb, and stops on Answer/Decline or when the call notification goes away (checked every second, at most 45 s). The `nsoro_calls_v3` channel is high-importance but **silent**, because a channel sound stays silent on phones with no ringtone set (BlueStacks has no sound files at all). Older channels are deleted.
    - **Permissions on start** (from 3.0.1): `LauncherActivity.shouldLaunchImmediately()` returns false while `CallSetupActivity.shouldAskOnStart()` (something missing, and no "Not now" in the last 7 days), opens the checklist first, and calls `launchTwa()` when it closes. Only an instance that isn't finishing may open it: the library's `onCreate` can finish the first instance and restart in a new task (e.g. opened from the installer's "Open"), and before 3.0.2 that lost the list. Tested on an Android 14 emulator (`nsoro14` AVD): with the app killed and the phone locked, a call wakes the phone, shows the call screen and rings. The checklist covers notifications (runtime request on Android 13+, then app settings), "Show calls over other apps", full-screen call alerts (Android 14+) and "Ring reliably" (battery optimisation exemption; Samsung puts background apps to sleep otherwise). The site card (`nsoro://call-setup`) opens the same screen.
    - **Chrome first** (from 3.0.1): `LauncherActivity.createTwaLauncher()` uses Chrome when it's installed. Other default browsers (Samsung Internet on many Samsungs) don't hand notifications to the app, so calls never reached `DelegationService` and never rang.
    - **Covering the screen while unlocked** (from 2.3.0): with "Display over other apps" allowed, `DelegationService` starts `IncomingCallActivity` directly (Android allows background starts with SYSTEM_ALERT_WINDOW). It posts the notification *first*, because the screen closes when it can't find the notification (it waits 3 s). The site shows a one-time "Ring like a phone call" card inside the app (`components/AppBanners`) that opens `CallSetupActivity` (`nsoro://call-setup`) to ask for it. An activity started from `LauncherActivity` ends up under the TWA, so don't start it from there.
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

**Emails.** The email on/off switch is in EditProfile (PATCH `/api/v1/nsoro/settings/email`). `/admin/updates` sends an app-update email to everyone; it's only for `user.role === "admin"`, set with the backend's `scripts/makeNsoroAdmin.js`.

**Look and layout.** The design must not resemble other social apps.
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
- **Right column:** a "People to follow" card with your account, suggestions with "Followed by …", and the footer links. There is no "Switch" and no floating Messages pill (both were another app's signatures).
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
