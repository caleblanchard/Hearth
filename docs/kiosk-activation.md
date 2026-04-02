# Kiosk Activation Redesign

**Status:** Design ✅ | Backend scaffolding ✅ | Client/UI ✅ | Tests ✅ | Migrations ✅ (apply if missing)

## Goals
- Replace parent-login kiosk bootstrap with a one-time activation code → device secret flow.
- Allow kiosk dashboard (family-wide view) without a logged-in user; allow child PIN unlock to elevate to full user permissions for that session.
- Support QR/text activation codes; codes are single-use, short-lived; secrets are revocable/rotatable.
- Enforce security: scoped access, rate limits, audit, PIN backoff, idle timeout (~15m) returning to kiosk dashboard.

## Flow Overview
1) **Parent generates activation code** (short-lived, single-use) from parent UI; can display as text + QR.  
2) **Device activation**: /kiosk prompts for code (or QR); posts to activation endpoint; server validates code → issues persistent device secret tied to family + deviceId; stores locally.  
3) **Kiosk dashboard**: device secret authenticates kiosk-only APIs to fetch family-wide read-only dashboard.  
4) **Child unlock**: tap “Who are you?” → pick member → enter PIN → server verifies PIN, issues short-lived child session token bound to member; client elevates to full app permissions (normal modules).  
5) **Timeout/Logout**: idle >15m or explicit logout ends child session and returns to kiosk dashboard; device secret persists for reuse until revoked/rotated.

## Security & Policy
- Activation code: single-use, short TTL (e.g., 10–15m), rate-limited per family/device; audit creation and redemption.  
- Device secret: opaque, per device, revocable/rotatable, scoped to family; cannot access non-kiosk endpoints. Consider binding to deviceId + optional fingerprint; store hashed server-side.  
- PIN unlock: rate-limit/backoff + temporary lock after N failures; audit success/failure.  
- Child session token: short-lived, idle timeout; same permissions as normal login for that member; carries kiosk metadata.  
- All kiosk/child actions audited; enforce HTTPS, CSRF-safe headers, and CORS limited to app origin.  
- QR codes encode activation code plus optional deviceId hint; never encode device secret.

## Data Model (proposed)
- `kiosk_activation_codes`: id, family_id, code_hash, expires_at, created_by, redeemed_at, redeemed_device_id.  
- `kiosk_device_secrets`: id, family_id, device_id, secret_hash, last_used_at, created_at, revoked_at, rotated_from_id?  
- `kiosk_child_sessions`: id, device_secret_id, member_id, session_token_hash, expires_at, last_activity_at, created_at, ended_at.

## APIs (sketch)
- `POST /api/kiosk/activation/start` (auth: parent) → { activationCode, expiresAt, qrData }.  
- `POST /api/kiosk/activation/complete` (auth: none) body { code, deviceId } → { deviceSecret, familyId }.  
- `POST /api/kiosk/activation/revoke` (auth: parent) body { deviceId|deviceSecretId }.  
- `GET /api/kiosk/dashboard` (auth: deviceSecret) → family dashboard data (modules unrestricted).  
- `POST /api/kiosk/unlock` (auth: deviceSecret) { memberId, pin } → { childSessionToken, member }.  
- `POST /api/kiosk/logout` (auth: childSessionToken).  
- `POST /api/kiosk/session/heartbeat` (auth: childSessionToken) refreshes idle timer.  
- Auth middleware: accept `X-Kiosk-Device` (device secret) and `X-Kiosk-Child` (child session).

## Client UX
- `/kiosk`: activation screen with code entry + QR scanner; on success store deviceSecret in local storage; show family dashboard.  
- Dashboard: read-only widgets; “Who are you?” to unlock; after unlock, full app navigation/modules with member context; idle timer visible; logout returns to dashboard.  
- Settings (parent): generate/revoke codes, list devices, rotate secrets, view audits.

## Implementation Plan & Status
- [x] Design doc
- [x] DB: tables for activation codes, device secrets, child sessions (migrations, types)
- [x] Auth middleware: deviceSecret + childSession parsing/validation
- [x] Activation APIs: start, complete, revoke; QR payload schema
- [x] Kiosk dashboard auth swap to deviceSecret
- [x] Child unlock: create child session token, enforce idle timeout/backoff
- [x] Client: activation UI; dashboard uses deviceSecret; elevation flow (hook + layout wired) — QR scan pending
- [~] Parent UI: device list + revoke (rotation UI pending)
- [x] Tests: unit (useKioskSession); integration coverage for auth/device flow/widgets
- [ ] Docs: user/admin guides

## Open Questions
- Device fingerprinting needed (UA/IP hash) or just deviceId + secret?  
- Desired TTL for activation code (default 10–15m?) and maximum concurrent codes per family?  
- Should kiosk device secrets expire automatically after inactivity, or only manual revoke/rotate?  
- Should child session reuse existing normal refresh tokens, or be kiosk-only opaque tokens?
