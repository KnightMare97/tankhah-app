module.exports = {
  content: ["./app/**/*.{html,js}"],
  darkMode: "class",
  theme: { extend: {
    colors: {
      "surface-container-highest":"#dfe3e7","secondary-container":"#fea619","primary-fixed":"#dae2fd","on-tertiary":"#ffffff","surface-container-high":"#e4e9ed","on-error-container":"#93000a","on-secondary":"#ffffff","surface-dim":"#d6dade","primary-container":"#131b2e","primary":"#000000","on-secondary-fixed-variant":"#653e00","tertiary":"#000000","background":"#f6fafe","on-primary-container":"#7c839b","on-background":"#171c1f","outline":"#76777d","secondary":"#855300","tertiary-fixed":"#d3e4fe","surface-tint":"#565e74","secondary-fixed-dim":"#ffb95f","surface-container-low":"#f0f4f8","inverse-primary":"#bec6e0","surface-container":"#eaeef2","on-primary":"#ffffff","on-tertiary-container":"#75859d","secondary-fixed":"#ffddb8","on-secondary-container":"#684000","tertiary-container":"#0b1c30","on-surface-variant":"#45464d","on-primary-fixed":"#131b2e","surface-variant":"#dfe3e7","surface-bright":"#f6fafe","error":"#ba1a1a","error-container":"#ffdad6","primary-fixed-dim":"#bec6e0","outline-variant":"#c6c6cd","surface-container-lowest":"#ffffff","inverse-on-surface":"#edf1f5","on-error":"#ffffff","surface":"#f6fafe","on-tertiary-fixed":"#0b1c30","on-secondary-fixed":"#2a1700","tertiary-fixed-dim":"#b7c8e1","on-surface":"#171c1f","inverse-surface":"#2c3134","on-tertiary-fixed-variant":"#38485d","on-primary-fixed-variant":"#3f465c"
    },
    borderRadius: { DEFAULT:"0.25rem", lg:"0.5rem", xl:"0.75rem", full:"9999px" },
    spacing: { gutter:"16px", base:"4px", md:"16px", xs:"8px", xl:"32px", sm:"12px", "margin-mobile":"16px", "margin-desktop":"40px", lg:"24px" },
    fontFamily: { "headline-lg":["Plus Jakarta Sans"],"headline-md":["Plus Jakarta Sans"],"body-md":["Inter"],"label-bold":["Inter"],"data-display":["Inter"],"headline-lg-mobile":["Plus Jakarta Sans"],"body-lg":["Inter"],"headline-sm":["Plus Jakarta Sans"] },
    fontSize: {
      "headline-lg":["28px",{lineHeight:"36px",fontWeight:"700"}],"headline-md":["22px",{lineHeight:"28px",fontWeight:"600"}],"body-md":["14px",{lineHeight:"20px",fontWeight:"400"}],"label-bold":["12px",{lineHeight:"16px",letterSpacing:"0.02em",fontWeight:"600"}],"data-display":["24px",{lineHeight:"32px",fontWeight:"700"}],"headline-lg-mobile":["24px",{lineHeight:"32px",fontWeight:"700"}],"body-lg":["16px",{lineHeight:"24px",fontWeight:"400"}],"headline-sm":["18px",{lineHeight:"24px",fontWeight:"600"}]
    }
  }}
,
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/container-queries")]
};
