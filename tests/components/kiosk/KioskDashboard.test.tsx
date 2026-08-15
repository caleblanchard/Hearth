import { render, screen } from '@testing-library/react';
import KioskDashboard from '@/components/kiosk/KioskDashboard';
import { useDashboardWidgets } from '@/hooks/useDashboardWidgets';

jest.mock('@/hooks/useDashboardWidgets', () => ({
  useDashboardWidgets: jest.fn(),
}));

jest.mock('@/components/dashboard/widgets/TransportWidget', () => (props: any) => (
  <div data-testid="transport-widget">{props.widget?.kind ?? 'transport'}</div>
));

jest.mock('@/components/dashboard/widgets/WeatherWidget', () => (props: any) => (
  <div data-testid="weather-widget">{props.widget?.kind ?? 'weather'}</div>
));

jest.mock('@/components/dashboard/widgets/MedicationWidget', () => (props: any) => (
  <div data-testid="medication-widget">{props.widget?.kind ?? 'medication'}</div>
));

jest.mock('@/components/dashboard/widgets/MaintenanceWidget', () => (props: any) => (
  <div data-testid="maintenance-widget">{props.widget?.kind ?? 'maintenance'}</div>
));

jest.mock('@/components/dashboard/widgets/InventoryWidget', () => (props: any) => (
  <div data-testid="inventory-widget">{props.widget?.kind ?? 'inventory'}</div>
));

describe('KioskDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useDashboardWidgets as jest.Mock).mockReturnValue({
      data: {
        transport: { kind: 'transport', state: 'ready', data: { schedules: [] } },
        weather: {
          kind: 'weather',
          state: 'ready',
          data: {
            location: 'Test City',
            current: {
              temp: 65,
              feelsLike: 63,
              condition: 'Clear',
              description: 'clear sky',
              icon: '01d',
            },
            today: { high: 70, low: 55 },
            forecast: [],
          },
        },
      },
      loading: false,
      error: null,
      partial: false,
      capturedAt: '2026-05-19T15:00:00.000Z',
      issues: [],
      refetch: jest.fn(),
    });
  });

  it('requests the visible widget collection for kiosk callers', () => {
    render(
      <KioskDashboard
        memberId="member-1"
        enabledWidgets={['transport', 'weather', 'medication']}
        enabledModules={['TRANSPORT', 'HEALTH']}
      />
    );

    expect(useDashboardWidgets).toHaveBeenCalledWith({
      widgets: ['transport', 'weather', 'medication'],
      memberId: 'member-1',
    });
    expect(screen.getByTestId('transport-widget')).toBeInTheDocument();
    expect(screen.getByTestId('weather-widget')).toBeInTheDocument();
    expect(screen.getByTestId('medication-widget')).toBeInTheDocument();
  });

  it('filters out widgets whose modules are disabled', () => {
    render(
      <KioskDashboard
        memberId="member-1"
        enabledWidgets={['transport', 'weather', 'inventory']}
        enabledModules={['TRANSPORT']}
      />
    );

    expect(useDashboardWidgets).toHaveBeenCalledWith({
      widgets: ['transport', 'weather'],
      memberId: 'member-1',
    });
    expect(screen.queryByTestId('inventory-widget')).not.toBeInTheDocument();
  });
});
