# Liquid Glass and Mesh Drift Integration

## Build
- Add a reusable Liquid Glass panel and responsive Lucide icon dock under the existing UI component directory.
- Add a plain WebGL1 Mesh Drift canvas using one fullscreen triangle, fixed monochrome uniforms, DPR capped at 2, resize handling, cleanup, and visibility-aware animation.
- Mount the canvas behind the authenticated application shell while keeping all navigation and page interactions above it.
- Add the requested background animation keyframes to the existing Tailwind v4 stylesheet.
- Add the small demo export requested for the Liquid Glass component.

## Responsive behavior
- Keep the dock fully visible with scale feedback on desktop.
- Reduce icon sizing on tablet.
- Use 40px mobile controls with horizontal scrolling and touch-safe interactions.

## Validation
- Check the live page at desktop and mobile sizes for rendering, overflow, interaction, and browser errors.

## Technical note
The conversation contains the shader requirements and uniform values, but not the referenced shader/component source bodies. The implementation will therefore reproduce the specified behavior and preserve every supplied uniform value exactly; source text that was not present cannot be copied byte-for-byte.
