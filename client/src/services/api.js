const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('borrowhub_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('/uploads/')) {
    const backendRoot = API_BASE.replace(/\/api\/?$/, '');
    return `${backendRoot}${url}`;
  }
  return url;
};

export const api = {
  // Auth
  async login(email, password) {
    let res;
    try {
      res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
    } catch {
      throw new Error('Unable to connect to the server. Please try again.');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 401) {
        throw new Error(err.error || 'Incorrect email or password.');
      }
      if (res.status >= 500) {
        throw new Error('Something went wrong. Please try again later.');
      }
      throw new Error(err.error || 'Incorrect email or password.');
    }
    return res.json();
  },

  async register(data) {
    let res;
    try {
      res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch {
      throw new Error('Unable to connect to the server. Please try again.');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (err.error && (err.error.includes('already exists') || err.error.includes('already registered'))) {
        throw new Error('This email is already registered. Please sign in.');
      }
      if (res.status >= 500) {
        throw new Error('Something went wrong. Please try again later.');
      }
      throw new Error(err.error || 'Registration failed. Please check your details.');
    }
    return res.json();
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch user profile');
    return res.json();
  },

  async getUsers() {
    const res = await fetch(`${API_BASE}/auth/users`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  // Equipment
  async getEquipment(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.category && params.category !== 'All' && params.category !== 'all') query.append('category', params.category);
    if (params.maxPrice) query.append('maxPrice', params.maxPrice);
    if (params.instantBook) query.append('instantBook', 'true');
    if (params.lender) query.append('lender', params.lender);
    if (params.location) query.append('location', params.location);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const qs = query.toString();
    const url = `${API_BASE}/equipment${qs ? `?${qs}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch equipment listings');
    return res.json();
  },

  async getEquipmentById(id) {
    const res = await fetch(`${API_BASE}/equipment/${id}`);
    if (!res.ok) throw new Error('Failed to fetch equipment details');
    return res.json();
  },

  async createEquipment(data) {
    const res = await fetch(`${API_BASE}/equipment`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create equipment');
    }
    return res.json();
  },

  async updateEquipment(id, data) {
    const res = await fetch(`${API_BASE}/equipment/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update equipment');
    }
    return res.json();
  },

  async deleteEquipment(id) {
    const res = await fetch(`${API_BASE}/equipment/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete equipment');
    }
    return res.json();
  },

  // Upload
  async uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    const token = localStorage.getItem('borrowhub_token');
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload image');
    }
    return res.json();
  },

  // Bookings
  async getBookings(role) {
    const url = `${API_BASE}/bookings${role ? `?role=${role}` : ''}`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch bookings');
    return res.json();
  },

  async getBookingById(id) {
    const res = await fetch(`${API_BASE}/bookings/${id}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch booking');
    return res.json();
  },

  async createBooking(data) {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create booking');
    }
    return res.json();
  },

  async updateBookingStatus(id, updateData) {
    const res = await fetch(`${API_BASE}/bookings/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update booking status');
    }
    return res.json();
  },

  // Messages
  async getMessages(withUser, bookingId) {
    const query = new URLSearchParams();
    if (withUser) query.append('withUser', withUser);
    if (bookingId) query.append('bookingId', bookingId);
    const qs = query.toString();
    const res = await fetch(`${API_BASE}/messages${qs ? `?${qs}` : ''}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch messages');
    return res.json();
  },

  async sendMessage(data) {
    const res = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to send message');
    }
    return res.json();
  },

  // Stats
  async getStats() {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  // AI
  async planProject(projectDescription, budget) {
    const res = await fetch(`${API_BASE}/ai/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectDescription, budget })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate AI plan');
    }
    return res.json();
  }
};
