const manifest = () => ({
  name: "Velora POS",
  short_name: "Velora",
  description: "Point of sale for Velora Group",
  start_url: "/pos",
  scope: "/",
  display: "standalone",
  background_color: "#0f0f0f",
  theme_color: "#0f0f0f",
  icons: [{ src: "/favicon.ico", sizes: "48x48", type: "image/x-icon" }],
})

export default manifest
