# Extension design consistency

Reviewed as an ordinary extension of the incumbent comic-apocalypse city. `PRODUCT.md`, `DESIGN.md`, and `.impeccable/design.json` remain unchanged. This record documents the added surfaces; it does not refresh historical design documentation or establish a new visual direction.

## Evidence

Inspected the incumbent product/design documents, the supplied gameplay brief, `GAMEPLAY_UPDATE.md`, and the relevant vehicle, pit, Flight, route, and HUD source. Visually inspected these staged runtime captures:

- `vehicles-desktop.png` and `vehicles-mobile.png`
- `pits-desktop.png`
- `flight-desktop.png` and `flight-mobile.png`
- `landing-mobile.png`

The captures show desktop and mobile-landscape compositions. `runtime.json` records no capture errors and explicitly identifies the images as staged fixtures. They establish visual evidence, not physical-device or uninterrupted late-game play evidence.

## Consistency assessment

- **Vehicles:** the 104 x 44 bus and 256 x 92 aircraft are source-authored pixel textures with nearest filtering. Weathered warm bus paint and muted green-gray aircraft metal sit within the existing cool city and warm-light palette. Windows, damage marks, stepped silhouettes, and wheels share the incumbent pixel vocabulary. The car, bus, and aircraft are immediately distinct in scale in both vehicle captures. Bitmap requirement numbers and zombie-head icons preserve the existing interface language.
- **Pits:** sewer, water, subway, and bridge treatments use hard pixel edges, dark cutouts, broken road rims, and restrained structural details. The four treatments read as extensions of the street instead of unrelated visual themes.
- **Flight:** existing bitmap text, power icon, duration bar, coin art, horde art, and fixed top HUD remain in use. Flight instructions sit below the flight corridor; the landing capture provides a clear `FLIGHT LAND` state and safe-road message. The city remains visible underneath, and mobile preserves the fitted composition with letterboxing.
- **Resolved review issue:** the initial Flight/HUD overlap was corrected by placing the member ceiling at 76 virtual pixels, with an additional 16 pixels for Giant, and keeping ordinary route coin centers within 82-140 pixels. The recaptured desktop and mobile Flight images show clear separation between the horde and the Flight status row. The supplied fresh-review verdict is ship for this resolved issue, with no other material findings; the supplied detector result was empty on the changed targets.
- **Assets and scope:** new art is generated from source. These PNGs are QA evidence, not shipping raster assets. Existing city identity, shared bitmap typography, scene structure, and UI controls are preserved.

## Result

The changed visual surfaces are consistent with the incumbent design system. No design-token, product-document, or sidecar update is needed for this extension. Gameplay and physics validation are recorded separately in `GAMEPLAY_UPDATE.md`; this consistency review does not independently certify those results.
