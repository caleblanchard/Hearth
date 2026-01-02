import { render, screen, waitFor } from '@testing-library/react';
import WeatherWidget from '@/components/dashboard/widgets/WeatherWidget';

// Mock fetch
global.fetch = jest.fn();

describe('WeatherWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  const mockWeatherData = {
    location: 'San Francisco, CA',
    current: {
      temp: 66,
      feelsLike: 63,
      condition: 'Clear',
      description: 'clear sky',
      icon: '01d',
    },
    today: {
      high: 70,
      low: 56,
    },
    forecast: [
      {
        date: '2024-01-16',
        high: 68,
        low: 55,
        condition: 'Clouds',
        description: 'few clouds',
        icon: '02d',
      },
      {
        date: '2024-01-17',
        high: 67,
        low: 54,
        condition: 'Rain',
        description: 'light rain',
        icon: '10d',
      },
    ],
  };

  it('should render widget title', () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockWeatherData,
    });

    render(<WeatherWidget />);
    expect(screen.getByRole('heading', { name: /weather/i })).toBeInTheDocument();
  });

  it('should display loading state initially', () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockWeatherData,
    });

    render(<WeatherWidget />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should fetch and display weather data', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockWeatherData,
    });

    render(<WeatherWidget />);

    await waitFor(() => {
      expect(screen.getByText('66°')).toBeInTheDocument();
      expect(screen.getByText(/clear sky/i)).toBeInTheDocument();
      expect(screen.getByText('San Francisco, CA')).toBeInTheDocument();
    });
  });

  it('should display high and low temperatures', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockWeatherData,
    });

    render(<WeatherWidget />);

    await waitFor(() => {
      expect(screen.getByText(/H: 70°/i)).toBeInTheDocument();
      expect(screen.getByText(/L: 56°/i)).toBeInTheDocument();
    });
  });

  it('should display forecast', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockWeatherData,
    });

    render(<WeatherWidget />);

    await waitFor(() => {
      expect(screen.getByText('68°')).toBeInTheDocument();
      expect(screen.getByText('67°')).toBeInTheDocument();
    });
  });

  it('should display error state on fetch failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    });

    render(<WeatherWidget />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });
});
