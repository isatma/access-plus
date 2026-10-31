# Access+ (Access Plus)

Access+ is a web platform that helps a person with quadriplegia or ALS, working with their occupational therapist, choose an alternative input method, practice it in browser simulators, and carry one control profile across computer, phone, wheelchair and environmental controls. The goal is that users don't have to relearn everything each time their function changes.

## What's in this repository

| Folder | Contents |
| --- | --- |
| `website/` | The Access+ web pages: home screen, input setup, OT workflow |
| `simulators/` | Browser simulators for practicing each input (computer, phone, wheelchair course) |
| `docs/` | Technical notes for developers. Project documents for the wider team live in the shared Google Drive folder. |

## Design principles

- **Never trapped:** an escape path that still works if tracking or software fails.
- **Standard outputs:** inputs become plain gamepad, keyboard/mouse (HID) or joystick-like signals any device can use.
- **Proportional with a dead zone:** ignore small unintended movement, then scale smoothly.
- **Near-zero effort floor:** settings start where the weakest user is.
- **Accessible first:** every page must be usable with nose tracking, eye tracking, on-screen keyboards, switches and voice.

## Status

Early stage. Screens are being designed as HTML mockups before coding begins.

## Contact

Project lead: Dave Whalen (GitHub: isatma)
