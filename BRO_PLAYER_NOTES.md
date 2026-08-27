# Bro Player browser control notes

Bro Player implements custom in-page controls that browsers expose safely: speed selection from 0.25x to 4x, play/pause, seeking, fullscreen, custom volume control, brightness simulation, quality-source selection, and left/right touch gestures.

Mobile operating-system hardware-volume buttons are controlled outside the webpage. Browsers do not provide a reliable, secure event for a site to detect every hardware-button press. The player therefore shows a volume indicator whenever its own in-page video volume changes and provides the right-side swipe gesture as the supported mobile control.

Quality choices are enabled when the selected episode includes real quality source URLs. A single uploaded source remains available as Auto/default quality until the administrator provides additional encodes or an adaptive-streaming source.

The watch route passes each published episode's `qualityVariants` map directly to Bro Player. Bro Player selects the corresponding video source when the member changes the quality setting and resets local playback state for the new source.
