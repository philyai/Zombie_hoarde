---
name: Zombie Horde Runner
description: Original crisp pixel art in a comic-apocalypse city at dusk.
colors:
  ink: "#13292f"
  paper: "#e8e4c6"
  horde-green: "#b4d77b"
  muted: "#a6b9ac"
  letterbox: "#090b0d"
  dusk-sky: "#203c49"
  haze: "#677367"
  skyline: "#354f54"
  buildings: "#29444a"
  lamp: "#c8b17a"
  panel-edge: "#71877b"
  panel-shadow: "#091b22"
  panel-highlight: "#334c4b"
  button-primary: "#a6cb72"
  button-primary-hover: "#cdeaa2"
  button-secondary: "#243f40"
  button-secondary-hover: "#3f5e55"
  button-disabled: "#203337"
  text-disabled: "#87938a"
  progress-track: "#354c49"
typography:
  display:
    fontFamily: "StreetPixel"
    fontSize: "24px"
    lineHeight: 1.125
  title:
    fontFamily: "StreetPixel"
    fontSize: "16px"
    lineHeight: 1.125
  label:
    fontFamily: "StreetPixel"
    fontSize: "8px"
    lineHeight: 1.125
rounded:
  square: "0px"
components:
  button-primary:
    backgroundColor: "{colors.button-primary}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    height: "24px"
  button-primary-hover:
    backgroundColor: "{colors.button-primary-hover}"
  button-secondary:
    backgroundColor: "{colors.button-secondary}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    height: "24px"
  button-secondary-hover:
    backgroundColor: "{colors.button-secondary-hover}"
  button-disabled:
    backgroundColor: "{colors.button-disabled}"
    textColor: "{colors.text-disabled}"
    height: "24px"
    rounded: "{rounded.square}"
  panel:
    backgroundColor: "{colors.ink}"
    rounded: "{rounded.square}"
  pause-panel:
    backgroundColor: "{colors.ink}"
    width: "206px"
    height: "166px"
    rounded: "{rounded.square}"
  mission-progress:
    backgroundColor: "{colors.progress-track}"
    width: "315px"
    height: "3px"
    rounded: "{rounded.square}"
---

# Design System: Zombie Horde Runner

## Overview

**Creative North Star: "Comic-apocalypse city at dusk"**

Original, crisp pixel art places an expressive green horde against a cool, layered city with warm lamps. The interface uses compact bitmap labels, hard edges and chunky controls. Preserve this user-pinned world when extending the game.

Sprite textures and the font atlas are generated once at boot from original code-native pixel drawings; there is no shipped external raster art. City scenery is drawn with Phaser rectangles when each scene is created. New visual work should continue that authored pixel vocabulary.

**Key Characteristics:**

- Cool dusk city, warm lamps and green horde accents.
- Original pixel silhouettes and a shared bitmap alphabet.
- Fixed virtual composition with aspect-preserving scaling.
- Hard bordered panels and tactile rectangular buttons.

## Colors

The normative frontmatter records reused colors from `PixelUI.ts` and `CityWorld.ts`; individual sprite details retain their authored palettes in `PixelArt.ts`.

### Primary

- **Horde green:** titles, population, score and progress accents.
- **Button primary:** the brighter green fill identifies Play, Retry and Resume; its hover color also indicates keyboard focus.

### Secondary

- **Lamp:** small warm street lights punctuate the cool city. Coins and reward text use related gold tones in their respective source drawings.

### Neutral

- **Ink, paper and muted:** dark panel surfaces, readable main labels and quieter supporting labels.
- **Dusk sky, haze, skyline and buildings:** layered atmospheric separation behind gameplay.
- **Panel edge, shadow and highlight:** structural pixel borders and offset depth.
- **Letterbox:** the browser background outside the fitted canvas.

## Typography

StreetPixel is an authored bitmap font, not an installed web font. Its atlas uses 5×7 glyphs, a 6-pixel advance and a 9-pixel line height at the base size. `pixelText` uppercases content and rounds its position.

- **Display:** the main title and results score use the display token.
- **Title:** screen headings and the RUNNER subtitle use the title token.
- **Label:** controls, HUD, instructions and supporting text use the label token.

**The Bitmap Rule.** Use the existing atlas and integer multiples of its base size; do not substitute browser-rasterized text inside the game.

## Layout

All measurements describe virtual pixels on a 480×270 canvas. Phaser FIT preserves the 16:9 composition, and CENTER_BOTH owns horizontal and vertical centering. CSS supplies a full-size relative parent and pixelated canvas rendering; it must not add competing grid centering. Letterboxing accommodates other aspect ratios. There are no responsive layout breakpoints or alternate mobile compositions.

The road begins at y=224. Menu and results panels center around x=240. Gameplay keeps its compact HUD along the top edge and contextual instructions beneath it. The pause panel measures 206×166 at (240,142); its button centers are 34 pixels apart. Button artwork is 24 pixels tall, with interactive bounds at least 32×32. These are canvas units, not fixed physical screen targets.

## Elevation & Depth

Depth comes from flat tonal layers and hard rectangular shadows. Panels cast an unblurred offset shadow (3 pixels right, 4 down); buttons use a smaller offset (2 right, 3 down). Both have inset highlight strips. Four city layers scroll at different ratios (0.06, 0.15, 0.35, 0.65), with rounded pixel positions. Lamp illumination is a translucent rectangle, not a filtered glow.

## Shapes

Panels and controls are square-cornered. Two-pixel borders and one- or two-pixel highlight strips supply structure. Sprite silhouettes, the moon and collectible outlines use stepped rectangles. Pixel art rendering, nearest texture filtering, rounded render positions and disabled antialiasing preserve crisp edges.

## Components

### Buttons

Primary controls pair a green face with ink text; secondary controls pair a dark face with paper text. Hover and keyboard focus lighten the face immediately. Pressing offsets the label down one pixel. Disabled controls use subdued fill, border and text, and activation does nothing. Menu keyboard navigation uses Tab or Up/Down and Enter. Width follows the scene's content; the shared helper owns the 32-pixel interactive height.

### Panels

The shared panel helper draws the muted edge, ink interior, inset top highlight and hard shadow. Menu subpages, the runner showcase, pause and results reuse it at scene-specific dimensions. The pause overlay dims the world behind its panel.

### HUD and progress

HUD text stays fixed to the camera. Score, coins and population are separated into compact top-row groups; the pause control sits at the right edge. Power-up text and short duration bars sit below. Mission progress uses a thin green fill over a dark track. Results use aligned label/value rows, with a large green score above the replay controls.

### Motion

Six running frames animate the characters, and six frames rotate coins. The menu advances its city slowly and cycles the showcase runners. Scene fades are brief (180 milliseconds for menu, 200 for results); HUD pulses restore opacity over 180 milliseconds. Keep motion legible at the pixel scale. Camera shake has an implemented user setting.

## Do's and Don'ts

### Do:

- **Do** retain the original cool dusk city, warm lamps and green horde.
- **Do** reuse the bitmap font, shared buttons and shared panels.
- **Do** treat 480×270 as the virtual layout and let Phaser center the fitted canvas.
- **Do** preserve the 32-pixel button hitboxes and visible hover/focus states.

### Don't:

- **Don't** introduce blur, smooth gradients or antialiased shapes into the pixel art.
- **Don't** replace original drawings with copied or external raster assets.
- **Don't** mistake virtual pixels for guaranteed physical touch-target sizes.
- **Don't** document the pre-edit 384×216 audit baseline as the current canvas size.
