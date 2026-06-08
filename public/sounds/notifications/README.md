# Notification Sounds

Place your notification audio file here:

```
public/sounds/notifications/new-notification.wav
```

## Requirements

- Format: `.wav` (recommended) or `.mp3`
- Filename: `new-notification.wav`
- Keep it short — 0.5 to 2 seconds is ideal.

## How it works

The sound is loaded once the user first interacts with the page (click, keypress, or touch),
which satisfies the browser's autoplay policy. It plays automatically on each incoming
real-time notification via Laravel Reverb.

## Finding free sounds

- https://freesound.org (search "notification chime", filter by CC0 license)
- https://mixkit.co/free-sound-effects/notification/
