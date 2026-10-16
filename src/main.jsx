import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './main.css';//This is for the styles
import { ChakraProvider } from "@chakra-ui/react";
import { extendTheme, theme as baseTheme } from "@chakra-ui/react";
import { mode } from "@chakra-ui/theme-tools";
// import { BrowserRouter } from "react-router-dom";
import { consumeGoogleLoginToken } from './utils/auth';
import { captureAppVersion } from './utils/appVersion';
import './utils/install'; // must load early to catch the browser's one-time install prompt
import './utils/tvRemote'; // arrow keys / OK move around the app on a TV

consumeGoogleLoginToken();
captureAppVersion(); // the Android app opens us with ?app_version= (in-app updates)

//We can also import React and ReactDOM from the modules above without the curly braises
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then((registration) => {
    console.log('Service Worker registered:', registration);
  }).catch((error) => {
    console.error('Service Worker registration failed:', error);
  });
}


// Nsoro theme ("star at night"): deep forest-green page, raised green-tinted
// surfaces, emerald for actions and gold for highlights.
//   nsoro.*  page tokens (use these instead of "black"/grey for app chrome;
//            photos and videos keep a black backdrop)
//   brand.*  emerald scale - colorScheme='brand' on buttons, switches, badges
//   gold.*   accent - stars, active nav, moments ring
const colors = {
  nsoro: {
    bg: "#0a1210",
    surface: "#111d18",
    raised: "#172620",
    hover: "rgba(120,220,170,0.08)",
    border: "#1f3229",
    text: "#ecf3ee",
    secondary: "#8fa59a",
    link: "#f5c542",
  },
  brand: {
    50: "#e7f7ef",
    100: "#c3ead6",
    200: "#99dab9",
    300: "#6cc99a",
    400: "#43b87e",
    500: "#1d9f63",
    600: "#13844f",
    700: "#0b6a3f",
    800: "#075230",
    900: "#043a21",
  },
  gold: {
    100: "#fff3c4",
    200: "#ffe58a",
    300: "#fbd250",
    400: "#f5c542",
    500: "#f2b705",
    600: "#c99503",
    700: "#9a7202",
  },
};

const fonts = {
  heading: `"Segoe UI Variable Display", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif`,
  body: `"Segoe UI Variable Text", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif`,
};

const styles = {
  global: (props) => ({
    body: {
      bg: mode("gray.100", "nsoro.bg")(props),
      color: mode("gray.800", "nsoro.text")(props),
      fontSize: "14px",
    },
    // Chakra draws avatar photos as circles; follow the rounded-square frame instead.
    ".chakra-avatar__img": { borderRadius: "inherit" },
    // On a TV (utils/tvRemote.js) the remote's position is a gold outline.
    "html.tv :focus": { outline: "3px solid #f2b705", outlineOffset: "2px" },
  }),
};

// Brand buttons are solid emerald with white text (Chakra's dark-mode default
// would be a pale mint), and everything is a little rounder than stock.
const brandSolid = {
  bg: "brand.500",
  color: "white",
  _hover: { bg: "brand.600", _disabled: { bg: "brand.500" } },
  _active: { bg: "brand.700" },
};
const components = {
  Modal: { baseStyle: { dialog: { bg: "nsoro.surface", border: "1px solid", borderColor: "nsoro.border", borderRadius: "2xl" } } },
  Menu: { baseStyle: { list: { bg: "nsoro.surface", borderColor: "nsoro.border", borderRadius: "xl" }, item: { bg: "nsoro.surface", _hover: { bg: "nsoro.hover" } } } },
  Button: {
    baseStyle: { borderRadius: "xl", fontWeight: "semibold" },
    variants: {
      solid: (props) => (props.colorScheme === "brand" ? brandSolid : baseTheme.components.Button.variants.solid(props)),
    },
  },
  // Rounded-square avatars - a Nsoro signature (no circles).
  Avatar: { baseStyle: { container: { borderRadius: "30%" }, excessLabel: { borderRadius: "30%" } } },
  Switch: { defaultProps: { colorScheme: "brand" } },
  Input: { defaultProps: { focusBorderColor: "brand.400" } },
  Textarea: { defaultProps: { focusBorderColor: "brand.400" } },
};

const config = {
  initialColorMode: "dark",
  useSystemColorMode: false,
};


// 3. extend the theme
const theme = extendTheme({ config, styles, colors, fonts, components });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ChakraProvider theme={theme}>
      {/* THis is for Creating Routes and Pages */}
      <App/>
    </ChakraProvider>
  </StrictMode>
)
console.log('Hello world')
