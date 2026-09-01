export const socialLinks = {
  facebook: "https://www.facebook.com/TeamAsphaltanddirt",
  facebookGroup: "https://www.facebook.com/share/g/1DEn4B1EX3/",
  instagram: "https://www.instagram.com/Asphaltanddirtpodcast",
  tiktok: "https://www.tiktok.com/@Asphaltanddirtpodcast",
  youtube: "https://www.youtube.com/@Asphaltanddirtpodcast",
  x: "https://x.com/AsphaltandDirt_",
} as const;

// Where to actually listen — used on pages that pitch the podcast itself
// rather than the website (e.g. the coming-soon splash), matching the
// sameAs links in the Organization JSON-LD in app/layout.tsx.
export const podcastLinks = {
  spotify: "https://open.spotify.com/show/1OJaB7uFY09JChAwTNpoko",
  apple: "https://podcasts.apple.com/us/podcast/asphalt-dirt-podcast/id6805523570",
  youtube: "https://www.youtube.com/@Asphaltanddirtpodcast",
} as const;
