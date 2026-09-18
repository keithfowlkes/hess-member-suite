# Fix business-partner editor menus

## Goal
Make every TinyMCE toolbar dropdown and menu item selectable inside the business-partner edit window.

## Changes
- Remove the conflicting dialog behavior that treats TinyMCE's document-level menus as outside interactions.
- Give TinyMCE menus a stable container within the edit window when supported, so focus and pointer handling stay in one interaction boundary.
- Keep image upload, image wrapping, and both Microsite and Member Offers editors working.
- Narrow global TinyMCE layering rules to what is needed rather than masking blocked interactions.

## Verification
- Open the partner editor and select items from Blocks, color, alignment, Insert, Format, Table, image, and context menus.
- Confirm chosen formatting changes the content and the dialog remains open.
- Confirm the image picker still opens and both editor tabs remain usable.
- Run the project type check and focused lint check.
