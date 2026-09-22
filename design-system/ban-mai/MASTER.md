# Ban Mai — White / lotus blush

User brief supersedes the prior dark landing (2026-09-17).

## Reviewed direction

UI-UX PRO MAX query `photography immersive 3D portfolio` recommended Motion-Driven portfolio/storytelling, which fits this product. The dataset's black palette does NOT fit the explicit brief and is not adopted. Three.js `animation cleanup dispose` guidance matches GPU geometry/material/instance cleanup. UX `keyboard focus modal` and its narrowed retry `dialog focus trap escape` returned general focus visibility guidance, not a verified focus-trap implementation; use native modal dialog semantics plus explicit keyboard wrap, tested in the browser. Keep React/Motion/plain CSS; add Three.js for the requested real 3D installation.

White is the canvas across landing, portfolio, packages, policy, auth, booking, payment and portals. Lotus blush gradient is primary. Black is typography/photographer equipment; blue is a secondary focus/data accent. No dark header/footer or black hero.

| Token | Value | Role |
| --- | --- | --- |
| Paper | #FFFFFF | All page backgrounds |
| Blush start | #F9CCE0 | Primary gradient light endpoint |
| Blush end | #EE91BB | Primary gradient saturated endpoint |
| Rose ink | #97315F | Accessible text/emphasis on white |
| Ink | #17171B | Primary text / camera silhouette |
| Blue | #2454DF | Keyboard focus / secondary emphasis |

Gradient CTA and active concept filters use dark rose text, not low-contrast white text. Semantic CSS tokens defined in phase1.css. Self-hosted Be Vietnam Pro 400/600 for body/UI and Playfair Display 400 regular/italic for art-direction typography, with Vietnamese glyphs rather than system-font fallback. 16px body/inputs, 12px metadata minimum, 4/8px spacing rhythm, max-width 1280px content.

## Layout and separation

```text
Landing:   [white navigation]
           [intro + CTA | professional mirrorless-camera 3D study]
           [Studio approach — text, no gallery or package prices]
           [links to separate Portfolio / Packages / Policy routes]
           [shared customer care: Zalo / Facebook + white footer]
Portfolio: [heading] [animated concept filter] [gallery OR multi-image collection]
           [selected collection: story/mood + photographs + modal viewer]
Packages:  [heading] [package choices, demo prices and availability]
Payment:   [booking reference and mock-payment state only]
```

Left-aligned Vietnamese copy, editorial serif contrast and a pink architectural arch; the floating camera is the memorable moment. No catalog fetch on landing. No gallery/package components in landing DOM. Shared navigation/footer only; pages do not mount one another. Landing explains the Studio approach without duplicating portfolio content.

## Motion and accessibility

Real WebGL/Three.js anonymous mirrorless-camera study: matte magnesium body, deep textured rubber grip, sloped EVF/hot shoe, stepped 85mm-style lens, fine instanced focus-ring knurling, recessed optics, curved coated glass, knurled dials, metal shutter/strap hardware and rear LCD/controls. Camera equipment stays black/neutral; remove the toy-like pink lens band, colored star aperture and orbiting bead/torus. Blush/blue belong to the background and restrained studio lighting. RoomEnvironment/PMREM reflections and procedural local grain/engraving/screen textures add material depth without external models, HDR downloads or camera permissions. Front/side/rear views work by mouse or keyboard/mobile button. Engine loads dynamically on landing only. GPU-unavailable/context-loss fallback is the original photographer/model SVG, visibly labeled as fallback, not misrepresented as 3D. This is an illustration, not a photograph or an exact manufacturer model.

Pause control, focus/hover pause for scene, pause offscreen/tab hidden; reduced motion renders static final scene. Simulated shutter updates one contextual status without taking photos, using webcam or writing backend data. Cleanup observers/listeners/timers and dispose geometry/material/texture/environment/instance/renderer resources. Instancing batches lens/dial knurling; fixed hardware is merged per shared material and indexed, with a verified budget of 22 draw calls. Use cheaper boxes/cylinders for subpixel hardware and keep curved detail on the main body/lens. MeshStandardMaterial handles PBR; PMREM reflections are limited to metal and lens glass, not matte rubber. Procedural grain uses an sRGB color map, avoiding the costly bump/iridescence variant discarded during software-render QA. Automatic motion targets 30 rendered frames/sec; DPR is capped at 1.25 and adapts down to .7 after sustained slow moving frames, restoring full capped resolution when paused/reduced-motion. No GPU fingerprinting. Environment resolution is 128. SVG icons use consistent 1.7px stroke, no emoji menu icons.

## Customer care

On sustained slow motion after reaching the moving DPR floor, use shared lightweight Phong materials for the moving scene only. Keep the full geometry, local grain/engraving and screen; paused, hovered, focused and reduced-motion views always restore full PBR/reflection materials and capped native resolution. Normal GPU devices keep PBR throughout. This measured-load fallback prevents software-renderer overload without pretending that every device reaches the 30fps target.

UI-UX PRO MAX targeted UX query `consistent help contact placement` matched Accessibility / Consistent Help. The shared footer therefore contains customer care in the same place across routes, with a `Liên hệ` navigation link that closes the mobile menu, scrolls to the section and transfers keyboard focus. No floating overlay obscures booking fields. Three.js query `environment physically based materials` matched shared-material reuse (not environment-specific guidance); environment/PBR choices were checked against the official Three.js documentation.

Public configuration: `client/public/studio-contact.json` has `zalo` and `facebook` URL strings. Blank values stay explicitly unavailable, never fake Studio accounts or `href="#"` buttons. Read-only static config is fetched with no-store, no backend/CMS/DB write. Validate HTTPS, allowlisted exact platform host and absence of credentials/custom port before rendering links. Config failure cannot block page content. Active links are 44px minimum, keyboard accessible, open a new tab with noopener/noreferrer and announce this to assistive technology. No embedded social SDK, tracking widget or account-access request. All page/footer backgrounds stay white; rose text meets the established palette. Official Studio links still need owner confirmation.

Concept filters have a sliding blush indicator and direction-aware exit/enter transitions. Selection is URL-backed (`?concept=id`) and supports deep links/back/forward/rapid switching; query changes do not reset page scroll. Reduced motion removes spatial transitions. Collections have story/mood and multiple distinct photos, not repeated cover crops. The three known seed concepts each contain 3 local stock photos, clearly labeled illustration/not Studio work. API `images: [{ src, alt, caption, demo? }]` takes precedence; unknown real covers are never supplemented with stock. No backend/DB mutation for these fixtures.

Photo viewer is a white native modal dialog portaled to body, with descriptive title, close, previous/next controls, arrow keys, Escape, explicit Tab wrap, scroll lock and focus return to the opened photograph. No auto-advancing carousel. Portraits use object-contain in the viewer so the entire frame can be evaluated.

Verify desktop/mobile/tablet/landscape, white surfaces per route, no horizontal overflow, keyboard menu/skip link, readable contrast, reduced motion, route separation and mocked business workflows. No production/Phase 1 completion claim from UI polish alone.
