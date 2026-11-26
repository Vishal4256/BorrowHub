process.env.NODE_ENV = 'test';
process.env.ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'test-admin-secret-key-12345';

import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import app from '../server.js';
import User from '../models/User.js';
import Equipment from '../models/Equipment.js';
import {
  validateLatLng,
  buildGeoJsonPoint,
  normalizeLocationInput
} from '../utils/locationValidator.js';
import {
  searchLocations,
  reverseGeocode,
  clearGeocodeCache
} from '../services/geocodingService.js';

let server;
let baseUrl;
let lenderToken;
let lenderId;
let borrowerToken;

test.before(async () => {
  const baseUri =
    process.env.MONGO_TEST_URI ||
    process.env.MONGO_URI ||
    'mongodb://127.0.0.1:27017/borrowhub_test';

  if (mongoose.connection.readyState === 2) {
    await new Promise((resolve, reject) => {
      mongoose.connection.once('open', resolve);
      mongoose.connection.once('error', reject);
    });
  } else if (mongoose.connection.readyState === 0) {
    await mongoose.connect(baseUri, {
      dbName: 'borrowhub_test',
      serverSelectionTimeoutMS: 8000,
      family: 4
    });
  }

  const activeDb = mongoose.connection.db?.databaseName || '';
  if (!activeDb.includes('test')) {
    throw new Error(`SAFETY ABORT: Refusing to run tests on non-test DB "${activeDb}".`);
  }

  await User.deleteMany({});
  await Equipment.deleteMany({});
  await Equipment.createIndexes();

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      resolve();
    });
  });

  // Register lender & borrower users
  const lenderRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Geo Lender',
      email: 'geolender@test.local',
      password: 'Password123!',
      role: 'lender',
      location: 'Phagwara, Punjab'
    })
  });
  const lenderData = await lenderRes.json();
  lenderToken = lenderData.token;
  lenderId = lenderData.user._id;

  const borrowerRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Geo Borrower',
      email: 'geoborrower@test.local',
      password: 'Password123!',
      role: 'borrower'
    })
  });
  const borrowerData = await borrowerRes.json();
  borrowerToken = borrowerData.token;
});

test.after(async () => {
  if (server) server.close();
  if (mongoose.connection.readyState !== 0 && mongoose.connection.db?.databaseName?.includes('test')) {
    await User.deleteMany({});
    await Equipment.deleteMany({});
  }
  await mongoose.disconnect();
});

// =========================================================================
// 1. UNIT TESTS: COORDINATE VALIDATION & GEOJSON ORDER
// =========================================================================
test('1. Unit: Coordinate validation and GeoJSON [longitude, latitude] order', () => {
  // Valid coordinates
  const valid = validateLatLng(31.2240, 75.7708);
  assert.equal(valid.valid, true);
  assert.equal(valid.latitude, 31.2240);
  assert.equal(valid.longitude, 75.7708);

  // GeoJSON Point order must strictly be [longitude, latitude]
  const point = buildGeoJsonPoint(75.7708, 31.2240);
  assert.deepEqual(point, {
    type: 'Point',
    coordinates: [75.7708, 31.2240]
  });

  // Invalid latitudes
  assert.equal(validateLatLng(90.01, 75.77).valid, false);
  assert.equal(validateLatLng(-90.01, 75.77).valid, false);
  assert.equal(validateLatLng('not-a-number', 75.77).valid, false);
  assert.equal(validateLatLng(null, 75.77).valid, false);

  // Invalid longitudes
  assert.equal(validateLatLng(31.22, 180.01).valid, false);
  assert.equal(validateLatLng(31.22, -180.01).valid, false);
  assert.equal(validateLatLng(31.22, '').valid, false);

  // Invalid GeoJSON structure
  const badGeoType = normalizeLocationInput({
    address: 'Phagwara',
    coordinates: { type: 'Polygon', coordinates: [75.77, 31.22] }
  });
  assert.equal(badGeoType.valid, false);

  const badGeoLen = normalizeLocationInput({
    address: 'Phagwara',
    coordinates: { type: 'Point', coordinates: [75.77] }
  });
  assert.equal(badGeoLen.valid, false);
});

// =========================================================================
// 2. UNIT TESTS: GEOCODING & REVERSE GEOCODING SERVICE
// =========================================================================
test('2. Unit: Geocoding forward search, reverse geocoding & error handling', async () => {
  clearGeocodeCache();

  const mockSearchFetch = async () => ({
    ok: true,
    json: async () => [
      {
        place_id: 101,
        lat: '31.2240',
        lon: '75.7708',
        display_name: 'Phagwara, Kapurthala, Punjab, 144401, India',
        address: {
          city: 'Phagwara',
          state: 'Punjab',
          country: 'India',
          postcode: '144401'
        }
      }
    ]
  });

  const results = await searchLocations('Phagwara', { fetchImpl: mockSearchFetch });
  assert.equal(results.length, 1);
  assert.equal(results[0].city, 'Phagwara');
  assert.equal(results[0].state, 'Punjab');
  assert.equal(results[0].postalCode, '144401');
  assert.deepEqual(results[0].coordinates, {
    type: 'Point',
    coordinates: [75.7708, 31.224]
  });

  // Reverse geocoding mock
  const mockReverseFetch = async () => ({
    ok: true,
    json: async () => ({
      place_id: 202,
      lat: '31.2240',
      lon: '75.7708',
      display_name: 'Model Town, Phagwara, Punjab, 144401, India',
      address: {
        suburb: 'Model Town',
        city: 'Phagwara',
        state: 'Punjab',
        country: 'India',
        postcode: '144401'
      }
    })
  });

  const reversed = await reverseGeocode(31.2240, 75.7708, { fetchImpl: mockReverseFetch });
  assert.equal(reversed.city, 'Phagwara');
  assert.equal(reversed.state, 'Punjab');
  assert.equal(reversed.postalCode, '144401');
  assert.deepEqual(reversed.coordinates.coordinates, [75.7708, 31.224]);

  // Provider HTTP failure handling
  clearGeocodeCache();
  await assert.rejects(
    () =>
      reverseGeocode(31.224, 75.7708, {
        fetchImpl: async () => ({ ok: false, status: 503 })
      }),
    (err) => err.statusCode === 502
  );

  // Invalid coordinate rejection
  await assert.rejects(
    () => reverseGeocode(999, 75.77),
    (err) => err.statusCode === 400
  );
});

// =========================================================================
// 3. HTTP VALIDATION: GEOCODING ENDPOINTS
// =========================================================================
test('3. API: Location search and reverse endpoint parameter validation', async () => {
  const shortSearch = await fetch(`${baseUrl}/api/location/search?q=a`);
  assert.equal(shortSearch.status, 400);

  const missingReverse = await fetch(`${baseUrl}/api/location/reverse?lat=31.22`);
  assert.equal(missingReverse.status, 400);

  const invalidReverse = await fetch(`${baseUrl}/api/location/reverse?lat=120&lng=75.77`);
  assert.equal(invalidReverse.status, 400);
});

// =========================================================================
// 4. EQUIPMENT LISTING LOCATION INTEGRATION & VALIDATION
// =========================================================================
test('4. Equipment: Creating & updating with GeoJSON coordinates + legacy backward compatibility', async () => {
  // Reject invalid coordinates on create
  const badLatRes = await fetch(`${baseUrl}/api/equipment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${lenderToken}`
    },
    body: JSON.stringify({
      title: 'Invalid Geo Saw',
      category: 'Power Tools',
      pricePerDay: 20,
      location: 'Nowhere',
      locationDetails: {
        address: 'Nowhere',
        coordinates: { type: 'Point', coordinates: [75.77, 120] } // Invalid lat 120
      }
    })
  });
  assert.equal(badLatRes.status, 400);

  // Legacy equipment creation without coordinates continues working
  const legacyRes = await fetch(`${baseUrl}/api/equipment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${lenderToken}`
    },
    body: JSON.stringify({
      title: 'Legacy Tripod',
      category: 'Photography & Video',
      pricePerDay: 15,
      location: 'Phagwara, Punjab'
    })
  });
  assert.equal(legacyRes.status, 201);
  const legacyItem = await legacyRes.json();
  assert.equal(legacyItem.location, 'Phagwara, Punjab');

  // Create equipment with full structured locationDetails & GeoJSON [lng, lat]
  const geoCreateRes = await fetch(`${baseUrl}/api/equipment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${lenderToken}`
    },
    body: JSON.stringify({
      title: 'Phagwara Center Camera Kit',
      category: 'Photography & Video',
      pricePerDay: 45,
      location: 'Phagwara, Punjab',
      locationDetails: {
        address: 'GT Road, Phagwara, Punjab, 144401, India',
        city: 'Phagwara',
        state: 'Punjab',
        country: 'India',
        postalCode: '144401',
        coordinates: {
          type: 'Point',
          coordinates: [75.7708, 31.2240]
        }
      }
    })
  });
  assert.equal(geoCreateRes.status, 201);
  const createdGeo = await geoCreateRes.json();
  assert.deepEqual(createdGeo.locationDetails.coordinates.coordinates, [75.7708, 31.224]);
  assert.equal(createdGeo.locationDetails.postalCode, '144401');

  // Update equipment location
  const updateRes = await fetch(`${baseUrl}/api/equipment/${createdGeo._id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${lenderToken}`
    },
    body: JSON.stringify({
      location: 'Model Town, Phagwara, Punjab',
      locationDetails: {
        address: 'Model Town, Phagwara, Punjab, 144401, India',
        city: 'Phagwara',
        state: 'Punjab',
        country: 'India',
        postalCode: '144401',
        coordinates: {
          type: 'Point',
          coordinates: [75.7720, 31.2250]
        }
      }
    })
  });
  assert.equal(updateRes.status, 200);
  const updatedGeo = await updateRes.json();
  assert.equal(updatedGeo.location, 'Model Town, Phagwara, Punjab');
  assert.deepEqual(updatedGeo.locationDetails.coordinates.coordinates, [75.772, 31.225]);
});

// =========================================================================
// 5. MONGODB 2DSPHERE NEARBY SEARCH: RADIUS, SORTING, EXCLUSION & PAGINATION
// =========================================================================
test('5. Nearby Search: 2dsphere query, radius filtering, distance sorting, availability exclusion & pagination', async () => {
  await Equipment.deleteMany({});

  // Search center: Phagwara (lat 31.2240, lng 75.7708)
  const fixtures = [
    {
      title: 'Phagwara Drill (2 km)',
      category: 'Power Tools',
      pricePerDay: 20,
      location: 'Phagwara, Punjab',
      isAvailable: true,
      lender: lenderId,
      locationDetails: {
        address: 'Phagwara East, Punjab',
        city: 'Phagwara',
        state: 'Punjab',
        country: 'India',
        postalCode: '144401',
        coordinates: { type: 'Point', coordinates: [75.79, 31.23] } // ~2.0 km
      }
    },
    {
      title: 'Phagwara Tent (0.5 km)',
      category: 'Camping & Outdoor',
      pricePerDay: 30,
      location: 'Phagwara, Punjab',
      isAvailable: true,
      lender: lenderId,
      locationDetails: {
        address: 'Phagwara Center, Punjab',
        city: 'Phagwara',
        state: 'Punjab',
        country: 'India',
        postalCode: '144401',
        coordinates: { type: 'Point', coordinates: [75.775, 31.226] } // ~0.46 km
      }
    },
    {
      title: 'Unavailable Phagwara Generator (0.2 km)',
      category: 'Power Tools',
      pricePerDay: 40,
      location: 'Phagwara, Punjab',
      isAvailable: false, // Must be excluded!
      lender: lenderId,
      locationDetails: {
        address: 'Phagwara Central',
        city: 'Phagwara',
        state: 'Punjab',
        country: 'India',
        postalCode: '144401',
        coordinates: { type: 'Point', coordinates: [75.771, 31.2245] }
      }
    },
    {
      title: 'Jalandhar Gimbal (~22 km)',
      category: 'Photography & Video',
      pricePerDay: 35,
      location: 'Jalandhar, Punjab',
      isAvailable: true,
      lender: lenderId,
      locationDetails: {
        address: 'Model Town, Jalandhar, Punjab',
        city: 'Jalandhar',
        state: 'Punjab',
        country: 'India',
        postalCode: '144003',
        coordinates: { type: 'Point', coordinates: [75.5762, 31.3260] } // ~21.7 km
      }
    },
    {
      title: 'Ludhiana Lawn Mower (~37 km)',
      category: 'Lawn & Garden',
      pricePerDay: 25,
      location: 'Ludhiana, Punjab',
      isAvailable: true,
      lender: lenderId,
      locationDetails: {
        address: 'Sarabha Nagar, Ludhiana, Punjab',
        city: 'Ludhiana',
        state: 'Punjab',
        country: 'India',
        postalCode: '141001',
        coordinates: { type: 'Point', coordinates: [75.8573, 30.9010] } // ~36.9 km
      }
    },
    {
      title: 'New Delhi Cinema Rig (~320 km)',
      category: 'Photography & Video',
      pricePerDay: 90,
      location: 'New Delhi, Delhi',
      isAvailable: true,
      lender: lenderId,
      locationDetails: {
        address: 'Connaught Place, New Delhi',
        city: 'New Delhi',
        state: 'Delhi',
        country: 'India',
        postalCode: '110001',
        coordinates: { type: 'Point', coordinates: [77.2090, 28.6139] }
      }
    }
  ];

  await Equipment.insertMany(fixtures);

  // 5a. Invalid parameters must return 400
  const badLat = await fetch(`${baseUrl}/api/equipment/nearby?lat=95&lng=75.77&radius=25`);
  assert.equal(badLat.status, 400);

  const badRadius = await fetch(`${baseUrl}/api/equipment/nearby?lat=31.224&lng=75.7708&radius=-10`);
  assert.equal(badRadius.status, 400);

  const badLimit = await fetch(`${baseUrl}/api/equipment/nearby?lat=31.224&lng=75.7708&limit=0`);
  assert.equal(badLimit.status, 400);

  // 5b. 5 km radius -> only the 2 available Phagwara items, sorted closest first
  const r5Res = await fetch(`${baseUrl}/api/equipment/nearby?lat=31.2240&lng=75.7708&radius=5`);
  assert.equal(r5Res.status, 200);
  const r5Data = await r5Res.json();
  assert.equal(r5Data.items.length, 2);
  assert.equal(r5Data.items[0].title, 'Phagwara Tent (0.5 km)');
  assert.equal(r5Data.items[1].title, 'Phagwara Drill (2 km)');
  assert.ok(r5Data.items[0].distanceKm < r5Data.items[1].distanceKm);
  assert.ok(r5Data.items.every((it) => it.isAvailable === true), 'Unavailable items excluded');

  // 5c. 25 km radius -> adds Jalandhar (~21.7 km), excludes Ludhiana (~37 km) & Delhi
  const r25Res = await fetch(`${baseUrl}/api/equipment/nearby?lat=31.2240&lng=75.7708&radius=25`);
  assert.equal(r25Res.status, 200);
  const r25Data = await r25Res.json();
  assert.equal(r25Data.items.length, 3);
  assert.equal(r25Data.items[2].title, 'Jalandhar Gimbal (~22 km)');
  assert.ok(r25Data.items[2].distanceKm > 15 && r25Data.items[2].distanceKm <= 25);

  // 5d. 50 km radius + Pagination (limit=2, page=1 & page=2) -> 4 items total (Phagwara x2, Jalandhar, Ludhiana)
  const p1Res = await fetch(`${baseUrl}/api/equipment/nearby?lat=31.2240&lng=75.7708&radius=50&page=1&limit=2`);
  assert.equal(p1Res.status, 200);
  const p1 = await p1Res.json();
  assert.equal(p1.pagination.total, 4);
  assert.equal(p1.pagination.totalPages, 2);
  assert.equal(p1.pagination.hasNextPage, true);
  assert.equal(p1.pagination.hasPrevPage, false);
  assert.equal(p1.items.length, 2);

  const p2Res = await fetch(`${baseUrl}/api/equipment/nearby?lat=31.2240&lng=75.7708&radius=50&page=2&limit=2`);
  assert.equal(p2Res.status, 200);
  const p2 = await p2Res.json();
  assert.equal(p2.items.length, 2);
  assert.equal(p2.pagination.hasNextPage, false);
  assert.equal(p2.pagination.hasPrevPage, true);
  assert.equal(p2.items[1].title, 'Ludhiana Lawn Mower (~37 km)');

  // No duplicate IDs across pages
  const allIds = [...p1.items, ...p2.items].map((i) => String(i._id));
  assert.equal(new Set(allIds).size, 4, 'No duplicate listings returned');
});

// =========================================================================
// 6. USER PREFERRED LOCATION UPDATES & PRIVACY PROTECTION
// =========================================================================
test('6. User Preferred Location: Auth protection, validation, update & privacy isolation', async () => {
  // Unauthenticated update rejected
  const unauthRes = await fetch(`${baseUrl}/api/auth/location`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: 'Phagwara',
      coordinates: { type: 'Point', coordinates: [75.7708, 31.2240] }
    })
  });
  assert.equal(unauthRes.status, 401);

  // Invalid coordinate update rejected
  const badCoordRes = await fetch(`${baseUrl}/api/auth/location`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${borrowerToken}`
    },
    body: JSON.stringify({
      address: 'Invalid Place',
      coordinates: { type: 'Point', coordinates: [999, 31.224] }
    })
  });
  assert.equal(badCoordRes.status, 400);

  // Valid update succeeds
  const updateRes = await fetch(`${baseUrl}/api/auth/location`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${borrowerToken}`
    },
    body: JSON.stringify({
      address: 'Phagwara, Punjab, 144401, India',
      city: 'Phagwara',
      state: 'Punjab',
      country: 'India',
      postalCode: '144401',
      coordinates: { type: 'Point', coordinates: [75.7708, 31.2240] }
    })
  });
  assert.equal(updateRes.status, 200);
  const updatedData = await updateRes.json();
  assert.equal(updatedData.user.location, 'Phagwara, Punjab, India');
  assert.deepEqual(updatedData.user.preferredLocation.coordinates.coordinates, [75.7708, 31.224]);

  // Privacy check: Peer directory MUST NOT expose preferredLocation or coordinates
  const peersRes = await fetch(`${baseUrl}/api/auth/users`, {
    headers: { Authorization: `Bearer ${lenderToken}` }
  });
  assert.equal(peersRes.status, 200);
  const peers = await peersRes.json();
  const borrowerPeer = peers.find((u) => u.email === 'geoborrower@test.local');
  assert.ok(borrowerPeer);
  assert.equal(borrowerPeer.preferredLocation, undefined, 'Must never expose user precise coordinates to peers');
});
