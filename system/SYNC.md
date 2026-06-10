# Codec Sync — Three Inline Copies

workpadsdotme inlines the pads-v1 codec in three places. All three must be kept in sync.

## The Three Copies

| File | Role |
|------|------|
| `js/lib/codec.js` | Full codec (encode + decode + validate). Loaded by main app. Exposes `window.WPCodec`. |
| `p/index.html` | Decode-only inline. Standalone receiver page. No external deps. |
| `p/customer.html` | Full encode + decode inline. Customer-facing receiver with ACK flow. |

## `#1pv/` native (2026-05-24)

KaiOS and `@workpads/codec` decode native G0–G6 frames. **workpadsdotme** `p/index.html` still uses legacy inline pads-v1 decoders only — port `pathc-native` + `native-v1-split` or call shared `WPCodec.decode` before app work.

## Canonical Spec

`workpads-standard/codec.md` is the normative source. All changes start there.

## What Must Stay in Sync

- `SCALAR_FIELDS` / `ALL_FIELDS` array — field names and bit positions
- Actions blob format (bit 9, `[uint8 count][uint16 title][uint16 notes]`)
- Flags word byte order (big-endian: `(frame[1] << 8) | frame[2]`)
- Scheme tag detection regex (`/^[0-9][a-z][a-z]\//`)
- Template byte value (`0x01`)

## Sync Checklist (run after any codec change)

1. Update `workpads-standard/codec.md`
2. Apply change to all three files above
3. If field set changed: bump codebook char in `SCHEME_TAG` (`a` → `b` etc.) in all three
4. If frame format changed: update `workpads-codec/src/bitpad.js` and `workpadskaios/js/lib/codec.js`
5. Update `workpads-standard/record-schema.md` presence flags table

## Automated Checks

`workpadsdev conform` (in `workpadsdev-cli/`) runs a codec round-trip test for workpadskaios.
No automated check exists for workpadsdotme's inline copies — manual sync required.
