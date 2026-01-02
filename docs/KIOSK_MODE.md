# Kiosk Mode Implementation Guide

## Overview

Kiosk Mode provides a public/semi-public family dashboard for shared devices (e.g., kitchen tablets, family room screens). It features quick member switching via PIN authentication, auto-lock after inactivity, and customizable widgets for displaying family information.

## Features

### Core Functionality
- **PIN-Based Authentication**: Family members can unlock the kiosk using their personal PIN
- **Auto-Lock**: Configurable timeout (default: 15 minutes) locks kiosk after inactivity
- **Activity Detection**: Mouse, touch, and keyboard activity resets the auto-lock timer
- **Visual Countdown**: Warning displays when auto-lock is imminent (< 60 seconds)
- **Session Persistence**: Kiosk sessions persist across page refreshes using localStorage
- **Audit Logging**: All kiosk actions are logged for security and accountability

### Dashboard Widgets (5)
1. **Transport Widget**: Today's transport schedules (pickups/dropoffs)
2. **Medication Widget**: Upcoming and overdue medications with "Mark as Taken"
3. **Maintenance Widget**: Home maintenance tasks with urgency indicators
4. **Inventory Widget**: Low stock items prioritized by urgency
5. **Weather Widget**: Current weather, high/low temperatures, 3-day forecast

### Parent Controls
- Enable/disable kiosk mode
- Configure auto-lock timeout (1-120 minutes)
- Select which widgets to display
- Allow/restrict guest view when locked
- Require PIN for member switching

## Architecture

### Database Models

**KioskSession**
- Tracks active kiosk sessions by device
- Stores current member, last activity, auto-lock settings
- Unique session token for authentication

**KioskSettings**
- Family-specific kiosk configuration
- Enabled widgets, timeout duration, access controls

### API Endpoints

**Session Management**
- `POST /api/kiosk/session/start` - Initialize kiosk session
- `GET /api/kiosk/session` - Get current session status
- `POST /api/kiosk/session/activity` - Update activity timestamp (heartbeat)
- `POST /api/kiosk/session/lock` - Manually lock kiosk
- `POST /api/kiosk/session/unlock` - Unlock with member PIN
- `DELETE /api/kiosk/session` - End kiosk session (parents only)

**Settings & Widgets**
- `GET /api/kiosk/settings` - Fetch kiosk settings
- `PUT /api/kiosk/settings` - Update settings (parents only)
- `GET /api/dashboard/widgets` - Aggregated widget data endpoint
- `GET /api/weather` - Weather data from OpenWeatherMap

### Custom Hooks

**useKioskSession**
- Manages kiosk session state and operations
- localStorage persistence of session token
- Provides: startSession, endSession, updateActivity, unlock, lock, refreshSession

**useKioskAutoLock**
- Countdown timer for auto-lock functionality
- Resets on activity detection
- Calls onLock when timer reaches zero

**useActivityDetection**
- Detects mouse, touch, and keyboard activity
- Throttles callbacks (default: 5 seconds)
- Proper cleanup on unmount

**useDashboardWidgets**
- Fetches widget data from aggregation endpoint
- Auto-refresh at configurable interval (default: 5 minutes)
- Handles loading and error states

## Setup & Configuration

### Environment Variables

Add to `.env.local`:

```bash
# Weather API (OpenWeatherMap)
WEATHER_API_KEY=your_openweathermap_api_key
```

### Database Migration

Run Prisma migration to add kiosk tables:

```bash
npx prisma migrate deploy
npx prisma generate
```

### Initial Setup

1. **Login as Parent**: Navigate to `/dashboard`
2. **Configure Kiosk Settings**: Go to Settings > Kiosk Settings
3. **Enable Kiosk Mode**: Toggle on
4. **Configure Timeout**: Set auto-lock duration
5. **Select Widgets**: Choose which widgets to display
6. **Save Settings**

### Starting Kiosk Mode

1. Navigate to **Kiosk > Kiosk Mode** in sidebar
2. Kiosk launches in locked state
3. Click anywhere to open member selection
4. Select member and enter PIN
5. Dashboard displays with personalized widgets

## Usage Patterns

### For Families

**Kitchen Tablet Setup**
- Mount tablet in kitchen
- Open browser to `/kiosk`
- Set browser to fullscreen/kiosk mode
- Family members unlock to view personalized info

**Family Room Display**
- Large screen/TV with browser
- Display weather, schedules, and household info
- Quick glance at daily activities
- Touch screen for interaction

### For Parents

**Configuration**
- Access `/dashboard/settings/kiosk`
- Adjust timeout based on usage patterns
- Enable/disable widgets seasonally
- Monitor audit logs for usage

**Session Management**
- Start kiosk sessions for specific devices
- End sessions when device changes location
- View active sessions in admin panel (future feature)

## Security Considerations

### Authentication & Authorization
- Only parents can start/end kiosk sessions
- PIN validation for member switching
- Family ownership verification on all endpoints
- Unique session tokens per device

### Rate Limiting
- Limit PIN attempts (5 failures = 5-minute lockout)
- Throttle activity heartbeat (max 1 per 5 seconds)

### Session Security
- Auto-expire sessions after 24 hours of inactivity
- Clear session token on session end
- HTTPS required for production

### Data Privacy
- Locked dashboard shows family-wide data only
- Personalized data requires PIN authentication
- Audit logging for compliance

## Testing

### Unit & Integration Tests: 167 passing

**Backend (79 tests)**
- Kiosk session management (20 tests)
- API endpoints (48 tests)
- Business logic (11 tests)

**Frontend (88 tests)**
- Custom hooks (39 tests)
- UI components (17 tests)
- Dashboard widgets (32 tests)

### E2E Tests (Playwright)

See `__tests__/e2e/kiosk.spec.ts` for example tests:
- Navigation to kiosk mode
- Member unlock flow
- Widget display
- Auto-lock functionality
- Settings configuration

Run E2E tests:
```bash
npm install -D @playwright/test
npx playwright install
npx playwright test
```

## Performance Optimization

### Widget Loading
- Single aggregated API call for all widgets
- Promise.allSettled for parallel loading
- Graceful error handling per widget
- Auto-refresh every 5 minutes

### Activity Detection
- Throttled event listeners (5-second minimum)
- Document-level listeners (not per-element)
- Proper cleanup on unmount

### Session Heartbeat
- 30-second interval for activity updates
- Server-side validation of timestamps
- Minimal payload (just timestamp update)

## Troubleshooting

### Kiosk Won't Unlock
- Verify PIN is correct
- Check network connectivity
- Verify session hasn't expired
- Check browser console for errors

### Widgets Not Loading
- Verify API endpoints are accessible
- Check WEATHER_API_KEY is configured
- Ensure family location is set (for weather)
- Check browser console for errors

### Auto-Lock Not Working
- Verify kiosk settings are saved
- Check browser supports activity detection
- Ensure JavaScript is enabled
- Check for browser console errors

## Future Enhancements

### Planned Features
- [ ] Multi-device session management
- [ ] Widget customization per member
- [ ] Voice control integration
- [ ] Notification system
- [ ] Guest mode with limited access
- [ ] Widget marketplace

### Performance Improvements
- [ ] Service worker for offline support
- [ ] WebSocket for real-time updates
- [ ] Image optimization for weather icons
- [ ] PWA support for installation

## Support

### Documentation
- API Documentation: `/docs/API.md`
- Component Library: `/docs/COMPONENTS.md`
- Deployment Guide: `/docs/DEPLOYMENT.md`

### Reporting Issues
- GitHub Issues: Create detailed bug reports
- Include browser version, device type
- Attach screenshots if applicable
- Provide steps to reproduce

## License

Part of Household ERP - See main LICENSE file.
