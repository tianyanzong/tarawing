# Fonts used for card names and astro content

`--font-tarot` in `client/app/globals.css` is the display font applied to
tarot card names, spread/astrology headings, and zodiac sign labels:

```css
--font-tarot: 'Tarotheque', 'Basteleur', 'Pirata One', var(--serif);
```

## Basteleur — free, but self-hosted

[Basteleur](https://velvetyne.fr/fonts/basteleur/) is a genuine free/open
font from **Velvetyne Type Foundry**, explicitly designed around Tarot de
Marseille imagery — a very on-brand pick. It's released under a libre
license (credit the designer and foundry when you use it), but it is not
distributed on a public CDN, so it has to be self-hosted:

1. Download it from velvetyne.fr/fonts/basteleur (or their GitLab).
2. Drop `Basteleur-Bold.woff2`/`.otf` and `Basteleur-Heavy.woff2`/`.otf`
   into `client/public/fonts/`.
3. It activates automatically — the `@font-face` rules are already in
   `globals.css`, just waiting for the files.

No files are bundled in this repo (this build environment had no way to
download binary font assets), so until you add them, the stack falls
through to the next option.

## Tarotheque — could not verify a free license

I could not confirm "Tarotheque" is freely licensed — it reads as a
commercial display font. I didn't want to silently bundle or hotlink
something that might not be legally clear, so it's declared first in the
stack (in case you already own a license) but never shipped:

- If you have a legitimate license for Tarotheque, drop `Tarotheque.woff2`
  / `.otf` into `client/public/fonts/` and it will be picked up automatically.
- If you don't, no action needed — the browser silently skips to the next
  font in the stack.

## Pirata One — the working fallback

[Pirata One](https://fonts.google.com/specimen/Pirata+One) is a free,
Google Fonts–hosted blackletter display face, already wired up via the
`@import` at the top of `globals.css`. Until Basteleur or Tarotheque files
are added, this is what actually renders — a real mystical/tarot-adjacent
look, with zero licensing ambiguity.
