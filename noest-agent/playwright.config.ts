import { defineConfig } from "playwright/test";

export default defineConfig({
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    locale: "fr-FR",
    timezoneId: "Africa/Algiers",
  },
});
