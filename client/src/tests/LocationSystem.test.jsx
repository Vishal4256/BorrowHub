import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LocationSelector from '../components/LocationSelector';
import ExplorePage from '../pages/ExplorePage';
import ListItemModal from '../components/ListItemModal';
import { api } from '../services/api';

const mockUpdateUserLocation = vi.fn();
let mockAuthUser = null;

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    isAuthenticated: Boolean(mockAuthUser),
    updateUserLocation: mockUpdateUserLocation
  })
}));

const PHAGWARA_LOCATION = {
  id: 'place-1',
  address: 'Model Town, Phagwara, Punjab, 144401, India',
  city: 'Phagwara',
  state: 'Punjab',
  country: 'India',
  postalCode: '144401',
  label: 'Phagwara, Punjab, India',
  coordinates: {
    type: 'Point',
    coordinates: [75.7708, 31.2240]
  }
};

describe('BorrowHub Smart Location System', () => {
  const originalGeolocation = navigator.geolocation;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockAuthUser = null;
    mockUpdateUserLocation.mockReset();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: originalGeolocation
    });
  });

  it('never requests GPS permission automatically on mount', () => {
    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition }
    });

    render(<LocationSelector onSelect={vi.fn()} />);
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it('handles GPS success, reverse geocodes coordinates, and waits for user confirmation', async () => {
    const getCurrentPosition = vi.fn((success) => {
      success({
        coords: { latitude: 31.2240, longitude: 75.7708 }
      });
    });
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition }
    });

    const reverseSpy = vi.spyOn(api, 'reverseGeocode').mockResolvedValue({
      success: true,
      location: PHAGWARA_LOCATION
    });

    const onSelect = vi.fn();
    render(<LocationSelector onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: /Use Current Location/i }));

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(reverseSpy).toHaveBeenCalledWith(31.2240, 75.7708);
      expect(screen.getByTestId('gps-confirmation-card')).toBeInTheDocument();
    });

    expect(screen.getByText('Phagwara, Punjab')).toBeInTheDocument();
    // Must not call onSelect until user explicitly confirms
    expect(onSelect).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Confirm Location/i }));
    expect(onSelect).toHaveBeenCalledWith(PHAGWARA_LOCATION);
  });

  it('handles GPS permission denied and allows manual location fallback', async () => {
    const getCurrentPosition = vi.fn((_, error) => {
      error({ code: 1, message: 'User denied Geolocation' });
    });
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition }
    });

    render(<LocationSelector onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Use Current Location/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/permission was denied/i);
    });

    // Manual input remains visible for fallback entry
    expect(screen.getByLabelText(/Enter location manually/i)).toBeInTheDocument();
  });

  it('handles GPS timeout and unsupported browser gracefully', async () => {
    // Timeout (code 3)
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((_, error) => error({ code: 3 }))
      }
    });

    const { rerender } = render(<LocationSelector onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Use Current Location/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/timed out/i);
    });

    // Unsupported browser
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: undefined
    });
    rerender(<LocationSelector key="unsupported" onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Use Current Location/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/not supported/i);
    });
  });

  it('supports manual location search, suggestions, and rejects unverified arbitrary text', async () => {
    const searchSpy = vi.spyOn(api, 'searchLocations').mockResolvedValue({
      success: true,
      results: [PHAGWARA_LOCATION]
    });

    const onSelect = vi.fn();
    render(<LocationSelector onSelect={onSelect} />);

    const input = screen.getByLabelText(/Enter location manually/i);
    fireEvent.change(input, { target: { value: '144401' } });
    fireEvent.click(screen.getByRole('button', { name: /^Find$/i }));

    await waitFor(() => {
      expect(searchSpy).toHaveBeenCalledWith('144401', 5);
      expect(screen.getByRole('option')).toBeInTheDocument();
    });

    // Typing alone does not commit arbitrary text as verified coordinates
    expect(onSelect).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('option'));
    expect(onSelect).toHaveBeenCalledWith(PHAGWARA_LOCATION);
  });

  it('integrates ExplorePage with LocationSelector, radius filters, distance badges, and save prompt', async () => {
    mockAuthUser = {
      _id: 'user-1',
      name: 'Test Borrower',
      email: 'borrower@test.local',
      role: 'borrower'
    };

    const getEquipmentSpy = vi.spyOn(api, 'getEquipment').mockResolvedValue([]);
    const searchSpy = vi.spyOn(api, 'searchLocations').mockResolvedValue({
      success: true,
      results: [PHAGWARA_LOCATION]
    });
    const nearbySpy = vi.spyOn(api, 'getNearbyEquipment').mockResolvedValue({
      items: [
        {
          _id: 'eq-1',
          title: 'Sony FX3 Camera',
          category: 'Photography & Video',
          pricePerDay: 55,
          retailValue: 3800,
          location: 'Phagwara, Punjab',
          distanceKm: 2.4,
          instantBook: true,
          images: []
        }
      ],
      pagination: {
        total: 1,
        page: 1,
        limit: 12,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      }
    });

    render(
      <MemoryRouter>
        <ExplorePage />
      </MemoryRouter>
    );

    // Without location selected, standard explore API is called
    await waitFor(() => {
      expect(getEquipmentSpy).toHaveBeenCalled();
    });

    // Select a manual verified location
    const input = screen.getByLabelText(/Enter location manually/i);
    fireEvent.change(input, { target: { value: 'Phagwara' } });
    fireEvent.click(screen.getByRole('button', { name: /^Find$/i }));

    await waitFor(() => {
      expect(searchSpy).toHaveBeenCalled();
      expect(screen.getByRole('listbox', { name: /Location suggestions/i })).toBeInTheDocument();
    });
    const listbox = screen.getByRole('listbox', { name: /Location suggestions/i });
    fireEvent.click(within(listbox).getByRole('option'));

    await waitFor(() => {
      expect(nearbySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          lat: 31.2240,
          lng: 75.7708,
          radius: 25
        })
      );
    });

    expect(screen.getByText(/Showing equipment near/i)).toHaveTextContent('Showing equipment near Phagwara, Punjab');
    expect(screen.getByText('2.4 km away')).toBeInTheDocument();

    // Test radius filter buttons (5 km, 10 km, 25 km, 50 km, 100 km)
    for (const label of ['5 km', '10 km', '25 km', '50 km', '100 km']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole('button', { name: '10 km' }));
    await waitFor(() => {
      expect(nearbySpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          lat: 31.2240,
          lng: 75.7708,
          radius: 10
        })
      );
    });

    // Prompt asks permission before saving preferred location
    expect(screen.getByText(/Save/i, { selector: 'p' })).toHaveTextContent(/preferred BorrowHub location/i);
    expect(mockUpdateUserLocation).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /^Save Location$/i }));
    await waitFor(() => {
      expect(mockUpdateUserLocation).toHaveBeenCalledTimes(1);
    });
  });

  it('requires verified location in ListItemModal and submits GeoJSON coordinates', async () => {
    mockAuthUser = {
      _id: 'lender-1',
      name: 'Test Lender',
      email: 'lender@test.local',
      role: 'lender'
    };

    vi.spyOn(api, 'searchLocations').mockResolvedValue({
      success: true,
      results: [PHAGWARA_LOCATION]
    });
    const createSpy = vi.spyOn(api, 'createEquipment').mockResolvedValue({ _id: 'new-eq' });

    const onClose = vi.fn();
    const onAddItem = vi.fn();

    render(
      <ListItemModal
        isOpen={true}
        onClose={onClose}
        onAddItem={onAddItem}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/DeWalt 20V Cordless Miter Saw/i), {
      target: { value: 'Bosch Hammer Drill' }
    });

    // Submitting without verified location fails validation
    fireEvent.click(screen.getByRole('button', { name: /Publish Listing/i }));
    expect(screen.getByText(/select a verified location/i)).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();

    // Select verified location
    fireEvent.change(screen.getByLabelText(/Enter location manually/i), {
      target: { value: 'Phagwara' }
    });
    fireEvent.click(screen.getByRole('button', { name: /^Find$/i }));

    await waitFor(() => {
      expect(screen.getByRole('listbox', { name: /Location suggestions/i })).toBeInTheDocument();
    });
    const modalListbox = screen.getByRole('listbox', { name: /Location suggestions/i });
    fireEvent.click(within(modalListbox).getByRole('option'));

    fireEvent.click(screen.getByRole('button', { name: /Publish Listing/i }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Bosch Hammer Drill',
          location: 'Phagwara, Punjab',
          locationDetails: expect.objectContaining({
            city: 'Phagwara',
            state: 'Punjab',
            postalCode: '144401',
            coordinates: {
              type: 'Point',
              coordinates: [75.7708, 31.2240]
            }
          })
        })
      );
    });
  });
});
