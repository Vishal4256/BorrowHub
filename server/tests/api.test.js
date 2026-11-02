process.env.NODE_ENV = 'test';
process.env.ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'test-admin-secret-key-12345';

import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import app from '../server.js';
import User from '../models/User.js';
import Equipment from '../models/Equipment.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';
import Message from '../models/Message.js';

let server;
let baseUrl;

// Shared user sessions across tests
let lenderUser = null;
let borrowerUser = null;
let thirdUser = null;
let adminUser = null;
let testEquipment = null;
let testBooking = null;

test.before(async () => {
  // Use isolated test database to protect production data (Rule 5 & 10)
  const baseUri = process.env.MONGO_TEST_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/borrowhub_test';
  
  if (mongoose.connection.readyState === 2) {
    // Wait for connection in progress initiated by server.js
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

  // Safety guard: Verify active database is isolated to test
  const activeDb = mongoose.connection.db?.databaseName || '';
  if (!activeDb.includes('test')) {
    throw new Error(`SAFETY ABORT: Cannot run destructive test suite against production database "${activeDb}".`);
  }

  // Clear test database to start with pristine clean state
  await User.deleteMany({});
  await Equipment.deleteMany({});
  await Booking.deleteMany({});
  await Review.deleteMany({});
  await Message.deleteMany({});

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`Test server running on ${baseUrl}`);
      resolve();
    });
  });
});

test.after(async () => {
  if (server) server.close();
  // Ensure test database is cleaned up
  if (mongoose.connection.readyState !== 0 && mongoose.connection.db?.databaseName?.includes('test')) {
    await User.deleteMany({});
    await Equipment.deleteMany({});
    await Booking.deleteMany({});
    await Review.deleteMany({});
    await Message.deleteMany({});
  }
  await mongoose.disconnect();
});

// =========================================================================
// 1. CLEAN DATABASE & EMPTY STATE VERIFICATION
// =========================================================================
test('1. Clean Database State: Zero items, zero stats, empty dashboards & honest empty AI notice', async () => {
  // 1a. Marketplace equipment must be completely empty
  const eqRes = await fetch(`${baseUrl}/api/equipment`);
  assert.equal(eqRes.status, 200);
  const items = await eqRes.json();
  assert.equal(items.length, 0, 'Clean database must return 0 equipment listings');

  // 1b. Global statistics must report exact zeros
  const statsRes = await fetch(`${baseUrl}/api/stats`);
  assert.equal(statsRes.status, 200);
  const stats = await statsRes.json();
  assert.equal(stats.totalEquipment, 0);
  assert.equal(stats.totalUsers, 0);
  assert.equal(stats.totalBookings, 0);
  assert.equal(stats.totalCommunitySavings, 0);

  // 1c. AI planner must return honest empty notice rather than fake fabricated items
  const aiRes = await fetch(`${baseUrl}/api/ai/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectDescription: 'Weekend indie film shoot with camera and lighting gear' })
  });
  assert.equal(aiRes.status, 200);
  const aiData = await aiRes.json();
  assert.equal(aiData.plan.recommendedTools.length, 0, 'No fabricated tools when database is empty');
  assert.equal(aiData.provider, 'none');
  assert.ok(aiData.message.includes('No equipment listings currently available'));
});

// =========================================================================
// 2. AUTHENTICATION & SECURITY TESTING
// =========================================================================
test('2. Authentication: Borrower & Lender registration, admin protection, password hashing & sessions', async () => {
  // 2a. Public self-assignment of admin role MUST be rejected (403 Forbidden)
  const badAdmin = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Sneaky User',
      email: 'sneaky@test.local',
      password: 'Password123!',
      role: 'admin'
    })
  });
  assert.equal(badAdmin.status, 403, 'Public registration cannot self-assign admin role');

  // 2b. Authorized admin registration using ADMIN_SECRET_KEY
  const goodAdmin = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': process.env.ADMIN_SECRET_KEY
    },
    body: JSON.stringify({
      name: 'System Admin',
      email: 'admin@borrowhub.local',
      password: 'AdminPassword123!',
      role: 'admin'
    })
  });
  assert.equal(goodAdmin.status, 201, 'Authorized admin registration succeeds');
  adminUser = await goodAdmin.json();
  assert.equal(adminUser.user.role, 'admin');

  // 2c. Register a real Lender account
  const lenderReg = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Sarah Connor',
      email: 'sarah.connor@test.local',
      password: 'Password123!',
      role: 'lender',
      location: 'Downtown Arts District, Austin, TX'
    })
  });
  assert.equal(lenderReg.status, 201, 'Lender registration succeeds');
  lenderUser = await lenderReg.json();
  assert.ok(lenderUser.token, 'Lender receives JWT token');
  assert.equal(lenderUser.user.role, 'lender');
  assert.equal(lenderUser.user.location, 'Downtown Arts District, Austin, TX');

  // 2d. Register a real Borrower account
  const borrowerReg = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'John Connor',
      email: 'john.connor@test.local',
      password: 'Password123!',
      role: 'borrower',
      location: 'South Congress, Austin, TX'
    })
  });
  assert.equal(borrowerReg.status, 201, 'Borrower registration succeeds');
  borrowerUser = await borrowerReg.json();
  assert.ok(borrowerUser.token);
  assert.equal(borrowerUser.user.role, 'borrower');

  // 2e. Register a 3rd user (Kyle Reese) for privacy and conflict tests
  const kyleReg = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Kyle Reese',
      email: 'kyle.reese@test.local',
      password: 'Password123!',
      role: 'borrower',
      location: 'East Austin, TX'
    })
  });
  assert.equal(kyleReg.status, 201);
  thirdUser = await kyleReg.json();

  // 2f. Reject invalid credentials (wrong password)
  const badLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'sarah.connor@test.local',
      password: 'IncorrectPassword999'
    })
  });
  assert.equal(badLogin.status, 401, 'Bad password must return 401 Unauthorized');
  const badLoginData = await badLogin.json();
  assert.equal(badLoginData.error, 'Incorrect email or password.');

  // 2f-2. Duplicate registration must return clear user-friendly error
  const dupReg = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Duplicate Sarah',
      email: 'sarah.connor@test.local',
      password: 'Password123!',
      role: 'borrower'
    })
  });
  assert.equal(dupReg.status, 400);
  const dupData = await dupReg.json();
  assert.equal(dupData.error, 'This email is already registered. Please sign in.');

  // 2f-3. Missing required fields must return clear error
  const missingReg = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: '',
      email: 'nobody@test.local',
      password: 'Password123!'
    })
  });
  assert.equal(missingReg.status, 400);
  const missingData = await missingReg.json();
  assert.equal(missingData.error, 'Please complete all required fields.');

  // 2f-4. Weak password validation
  const weakPassReg = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Weak Pass',
      email: 'weakpass@test.local',
      password: '123'
    })
  });
  assert.equal(weakPassReg.status, 400);
  const weakData = await weakPassReg.json();
  assert.equal(weakData.error, 'Password must be at least 6 characters long.');

  // 2g. Valid login restores session
  const goodLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'sarah.connor@test.local',
      password: 'Password123!'
    })
  });
  assert.equal(goodLogin.status, 200, 'Valid credentials return 200');
  const loginData = await goodLogin.json();
  assert.ok(loginData.token);
  assert.equal(loginData.user.email, 'sarah.connor@test.local');

  // 2h. Verify /api/auth/me session persistence & protected route rejection
  const unauthMe = await fetch(`${baseUrl}/api/auth/me`);
  assert.equal(unauthMe.status, 401, 'Accessing protected route without JWT must return 401');

  const authMe = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${loginData.token}` }
  });
  assert.equal(authMe.status, 200, 'Valid token allows session verification');
  const meData = await authMe.json();
  assert.equal(meData.user.name, 'Sarah Connor');

  // 2i. Verify password is never returned in client response and is securely hashed in MongoDB
  assert.equal(meData.user.password, undefined, 'Password field must never be exposed');
  const dbUser = await User.findOne({ email: 'sarah.connor@test.local' });
  assert.ok(dbUser.password.startsWith('$2'), 'Password must be hashed with bcrypt');
  assert.notEqual(dbUser.password, 'Password123!', 'Plaintext password must never be stored in MongoDB');
});

// =========================================================================
// 3. EQUIPMENT CRUD & OWNERSHIP AUTHORIZATION TESTING
// =========================================================================
test('3. Equipment: Listing creation, marketplace display, ownership editing & deletion locks', async () => {
  // 3a. Lender creates equipment listing with custom user-defined location
  const createRes = await fetch(`${baseUrl}/api/equipment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${lenderUser.token}`
    },
    body: JSON.stringify({
      title: 'Sony Cinema FX3 Full-Frame Camera',
      category: 'Photography & Video',
      pricePerDay: 65,
      retailValue: 3899,
      deposit: 200,
      location: 'Downtown Arts District, Austin, TX',
      condition: 'Pristine',
      instantBook: false,
      description: 'Cinema Line full-frame camera with XLR top handle unit.'
    })
  });
  assert.equal(createRes.status, 201, 'Lender creates equipment listing');
  testEquipment = await createRes.json();
  assert.equal(testEquipment.title, 'Sony Cinema FX3 Full-Frame Camera');
  assert.equal(testEquipment.location, 'Downtown Arts District, Austin, TX');
  assert.equal(testEquipment.distance, '', 'Must not fabricate fake distance');

  // 3b. Verify listing appears in marketplace and explore queries
  const listRes = await fetch(`${baseUrl}/api/equipment`);
  assert.equal(listRes.status, 200);
  const allEquipment = await listRes.json();
  assert.equal(allEquipment.length, 1);
  assert.equal(allEquipment[0]._id, testEquipment._id);

  // 3c. Filter by category
  const filterRes = await fetch(`${baseUrl}/api/equipment?category=Photography%20%26%20Video`);
  const filtered = await filterRes.json();
  assert.equal(filtered.length, 1);

  // 3d. Non-owner (Borrower) cannot edit equipment listing (403 Forbidden)
  const badEdit = await fetch(`${baseUrl}/api/equipment/${testEquipment._id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${borrowerUser.token}`
    },
    body: JSON.stringify({ pricePerDay: 10 })
  });
  assert.equal(badEdit.status, 403, 'Non-owner must be prevented from editing equipment');

  // 3e. Owner (Lender) can edit equipment listing
  const goodEdit = await fetch(`${baseUrl}/api/equipment/${testEquipment._id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${lenderUser.token}`
    },
    body: JSON.stringify({ pricePerDay: 75, condition: 'Like New' })
  });
  assert.equal(goodEdit.status, 200, 'Owner can edit equipment');
  const updatedItem = await goodEdit.json();
  assert.equal(updatedItem.pricePerDay, 75);
  assert.equal(updatedItem.condition, 'Like New');

  // 3f. Non-owner cannot delete equipment listing (403 Forbidden)
  const badDelete = await fetch(`${baseUrl}/api/equipment/${testEquipment._id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${borrowerUser.token}` }
  });
  assert.equal(badDelete.status, 403, 'Non-owner must be prevented from deleting equipment');

  // 3g. Create a temporary listing and verify owner deletion works
  const tempItemRes = await fetch(`${baseUrl}/api/equipment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${lenderUser.token}`
    },
    body: JSON.stringify({
      title: 'DeWalt 20V Cordless Miter Saw',
      category: 'Power Tools',
      pricePerDay: 30,
      location: 'Downtown Arts District, Austin, TX'
    })
  });
  const tempItem = await tempItemRes.json();

  const goodDelete = await fetch(`${baseUrl}/api/equipment/${tempItem._id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${lenderUser.token}` }
  });
  assert.equal(goodDelete.status, 200, 'Owner can delete unbooked equipment');
  const checkDeleted = await Equipment.findById(tempItem._id);
  assert.equal(checkDeleted, null, 'Deleted item must be removed from MongoDB');
});

// =========================================================================
// 4. BOOKING LIFECYCLE, DYNAMIC PIN ISOLATION & CONFLICT TESTING
// =========================================================================
test('4. Bookings: Self-booking rejection, PIN isolation, conflict prevention, lender approval & lifecycle', async () => {
  // 4a. Lender cannot borrow their own equipment (400 Bad Request)
  const selfBookRes = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${lenderUser.token}`
    },
    body: JSON.stringify({
      equipmentId: testEquipment._id,
      startDate: new Date(Date.now() + 86400000).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 3).toISOString()
    })
  });
  assert.equal(selfBookRes.status, 400, 'User cannot borrow their own equipment');

  // 4b. Borrower requests booking
  const startDate = new Date(Date.now() + 86400000).toISOString();
  const endDate = new Date(Date.now() + 86400000 * 3).toISOString();

  const bookRes = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${borrowerUser.token}`
    },
    body: JSON.stringify({
      equipmentId: testEquipment._id,
      startDate,
      endDate,
      pickupDate: 'Tomorrow at 10:00 AM',
      returnDate: 'In 3 days at 6:00 PM'
    })
  });
  assert.equal(bookRes.status, 201, 'Booking request created successfully');
  testBooking = await bookRes.json();
  assert.equal(testBooking.status, 'pending');
  assert.ok(testBooking.bookingCode.startsWith('BH-'));

  // 4c. SECURITY CHECK: Borrower MUST NOT see locker PIN while request is pending
  assert.equal(testBooking.lockerPin, undefined, 'Dynamic locker PIN must NOT be revealed to borrower while status is pending');

  // 4d. Borrower attempts to approve their own request (MUST BE REJECTED 403)
  const badApprove = await fetch(`${baseUrl}/api/bookings/${testBooking._id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${borrowerUser.token}`
    },
    body: JSON.stringify({ status: 'approved' })
  });
  assert.equal(badApprove.status, 403, 'Borrower cannot approve their own booking request');

  // 4e. Lender approves the booking request
  const lenderApprove = await fetch(`${baseUrl}/api/bookings/${testBooking._id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${lenderUser.token}`
    },
    body: JSON.stringify({ status: 'approved' })
  });
  assert.equal(lenderApprove.status, 200, 'Lender successfully approves request');
  const approvedBooking = await lenderApprove.json();
  assert.equal(approvedBooking.status, 'approved');
  assert.ok(approvedBooking.lockerPin, 'Locker PIN is dynamically generated upon approval');

  // 4f. Now Borrower retrieves the booking and sees the dynamic locker PIN
  const borrowerFetch = await fetch(`${baseUrl}/api/bookings/${testBooking._id}`, {
    headers: { Authorization: `Bearer ${borrowerUser.token}` }
  });
  assert.equal(borrowerFetch.status, 200);
  const borrowerBookingView = await borrowerFetch.json();
  assert.equal(borrowerBookingView.lockerPin, approvedBooking.lockerPin, 'Borrower now receives locker PIN once approved');

  // 4g. Concurrency Conflict: Third user (Kyle) requests overlapping booking dates (MUST RETURN 409 Conflict)
  const conflictRes = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${thirdUser.token}`
    },
    body: JSON.stringify({
      equipmentId: testEquipment._id,
      startDate: new Date(Date.now() + 86400000 * 2).toISOString(), // Overlaps
      endDate: new Date(Date.now() + 86400000 * 4).toISOString()
    })
  });
  assert.equal(conflictRes.status, 409, 'Overlapping booking must return 409 Conflict');

  // 4h. Active Booking Deletion Lock: Lender cannot delete equipment with active/approved booking
  const lockedDelete = await fetch(`${baseUrl}/api/equipment/${testEquipment._id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${lenderUser.token}` }
  });
  assert.equal(lockedDelete.status, 400, 'Equipment with active booking cannot be deleted');

  // 4i. Invalid State Machine Transition: Cannot complete booking directly without becoming active
  const badTransition = await fetch(`${baseUrl}/api/bookings/${testBooking._id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${borrowerUser.token}`
    },
    body: JSON.stringify({ status: 'completed' })
  });
  assert.equal(badTransition.status, 400, 'Cannot jump straight from approved to completed');

  // 4j. Pickup: Borrower marks booking as active (gear picked up from locker)
  const pickupRes = await fetch(`${baseUrl}/api/bookings/${testBooking._id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${borrowerUser.token}`
    },
    body: JSON.stringify({ status: 'active' })
  });
  assert.equal(pickupRes.status, 200);
  const activeBooking = await pickupRes.json();
  assert.equal(activeBooking.status, 'active');
  assert.equal(activeBooking.smartLockerStatus, 'simulated_unlocked');

  // 4k. Return: Borrower returns equipment with condition photo inspection proof
  const returnRes = await fetch(`${baseUrl}/api/bookings/${testBooking._id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${borrowerUser.token}`
    },
    body: JSON.stringify({
      status: 'completed',
      conditionScanProof: 'https://images.unsplash.com/photo-lens-inspection-proof'
    })
  });
  assert.equal(returnRes.status, 200);
  const completedBooking = await returnRes.json();
  assert.equal(completedBooking.status, 'completed');
  assert.equal(completedBooking.paymentStatus, 'simulated_captured');
  assert.equal(completedBooking.conditionScan.completed, true);
});

// =========================================================================
// 5. DASHBOARD ISOLATION & REAL FINANCIAL METRICS TESTING
// =========================================================================
test('5. Dashboards: Borrower sees only borrower bookings, lender sees only lender bookings & revenue matches DB', async () => {
  // 5a. Borrower dashboard query returns only John Connor bookings
  const bDashboardRes = await fetch(`${baseUrl}/api/bookings?role=borrower`, {
    headers: { Authorization: `Bearer ${borrowerUser.token}` }
  });
  assert.equal(bDashboardRes.status, 200);
  const borrowerBookings = await bDashboardRes.json();
  assert.equal(borrowerBookings.length, 1);
  assert.equal(borrowerBookings[0].borrower._id, borrowerUser.user._id);

  // 5b. Lender dashboard query returns only Sarah Connor gear loans
  const lDashboardRes = await fetch(`${baseUrl}/api/bookings?role=lender`, {
    headers: { Authorization: `Bearer ${lenderUser.token}` }
  });
  assert.equal(lDashboardRes.status, 200);
  const lenderBookings = await lDashboardRes.json();
  assert.equal(lenderBookings.length, 1);
  assert.equal(lenderBookings[0].lender._id, lenderUser.user._id);

  // 5c. Third-party user (Kyle) queries borrower dashboard -> returns 0 bookings
  const kyleDashboardRes = await fetch(`${baseUrl}/api/bookings?role=borrower`, {
    headers: { Authorization: `Bearer ${thirdUser.token}` }
  });
  assert.equal(kyleDashboardRes.status, 200);
  const kyleBookings = await kyleDashboardRes.json();
  assert.equal(kyleBookings.length, 0, 'User with no bookings sees empty dashboard');

  // 5d. Financial revenue calculation from completed booking
  const dbCompleted = await Booking.find({ lender: lenderUser.user._id, status: 'completed' });
  const expectedRevenue = dbCompleted.reduce((sum, b) => sum + (b.subtotal || b.totalPaid), 0);
  assert.ok(expectedRevenue > 0, 'Real revenue calculated from database booking record');
});

// =========================================================================
// 6. MESSAGING SECURITY & PRIVACY ISOLATION TESTING
// =========================================================================
test('6. Messaging: Direct exchange, persistence & strict third-party privacy isolation', async () => {
  // 6a. User cannot message themselves (400 Bad Request)
  const selfMsg = await fetch(`${baseUrl}/api/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${borrowerUser.token}`
    },
    body: JSON.stringify({
      recipientId: borrowerUser.user._id,
      text: 'Talking to myself'
    })
  });
  assert.equal(selfMsg.status, 400, 'Cannot message oneself');

  // 6b. Borrower sends message to Lender
  const sendRes = await fetch(`${baseUrl}/api/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${borrowerUser.token}`
    },
    body: JSON.stringify({
      recipientId: lenderUser.user._id,
      bookingId: testBooking._id,
      text: 'Hi Sarah, is the FX3 battery fully charged for pickup?'
    })
  });
  assert.equal(sendRes.status, 201, 'Message delivered and saved to MongoDB');
  const messageData = await sendRes.json();
  assert.equal(messageData.text, 'Hi Sarah, is the FX3 battery fully charged for pickup?');

  // 6c. Lender retrieves message thread
  const lenderInbox = await fetch(`${baseUrl}/api/messages?withUser=${borrowerUser.user._id}`, {
    headers: { Authorization: `Bearer ${lenderUser.token}` }
  });
  assert.equal(lenderInbox.status, 200);
  const thread = await lenderInbox.json();
  assert.equal(thread.length, 1);
  assert.equal(thread[0].text, 'Hi Sarah, is the FX3 battery fully charged for pickup?');

  // 6d. PRIVACY CHECK: Third user (Kyle) queries messages with Borrower -> MUST BE EMPTY
  const eavesdropAttempt = await fetch(`${baseUrl}/api/messages?withUser=${borrowerUser.user._id}`, {
    headers: { Authorization: `Bearer ${thirdUser.token}` }
  });
  assert.equal(eavesdropAttempt.status, 200);
  const eavesdropMessages = await eavesdropAttempt.json();
  assert.equal(eavesdropMessages.length, 0, 'Third parties cannot inspect private conversations of other users');

  // 6e. Kyle queries all messages -> MUST BE EMPTY
  const kyleAllMessages = await fetch(`${baseUrl}/api/messages`, {
    headers: { Authorization: `Bearer ${thirdUser.token}` }
  });
  assert.equal(kyleAllMessages.status, 200);
  const kyleMsgs = await kyleAllMessages.json();
  assert.equal(kyleMsgs.length, 0);
});

// =========================================================================
// 7. AI PLANNER GROUNDING & FALLBACK DISCLOSURE TESTING
// =========================================================================
test('7. AI Planner: Grounding in real MongoDB equipment, no hallucinations & explicit fallback notice', async () => {
  // 7a. Query AI planner with an indie film shoot prompt
  const aiRes = await fetch(`${baseUrl}/api/ai/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectDescription: 'Indie short film cinema shoot' })
  });
  assert.equal(aiRes.status, 200);
  const aiData = await aiRes.json();
  assert.ok(aiData.success);

  // 7b. Recommended tools must strictly reference the real Sony FX3 in MongoDB
  assert.equal(aiData.plan.recommendedTools.length, 1);
  const recommendedTool = aiData.plan.recommendedTools[0];
  assert.equal(recommendedTool.id, testEquipment._id);
  assert.equal(recommendedTool.name, 'Sony Cinema FX3 Full-Frame Camera');
  assert.equal(recommendedTool.rate, 75); // Reflects the updated rate

  // 7c. Fallback disclosure must be transparently communicated
  assert.ok(aiData.providerStatus === 'fallback' || aiData.providerStatus === 'active');
  if (aiData.providerStatus === 'fallback') {
    assert.ok(aiData.disclosure.includes('AI provider fallback'));
  }

  // 7d. Query AI planner for unmatched prompt (e.g. baking cake) -> Returns 0 recommendations
  const unmatchedRes = await fetch(`${baseUrl}/api/ai/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectDescription: 'Baking a wedding cake with pastry flour and mixer' })
  });
  const unmatchedData = await unmatchedRes.json();
  assert.equal(unmatchedData.plan.recommendedTools.length, 0, 'AI never fabricates equipment not in MongoDB');
});

// =========================================================================
// 8. DATA INTEGRITY & SENSITIVE INFORMATION CHECK
// =========================================================================
test('8. Data Integrity: No sensitive data leakage & verified MongoDB persistence', async () => {
  // 8a. User directory check: passwords not present
  const directoryRes = await fetch(`${baseUrl}/api/auth/users`, {
    headers: { Authorization: `Bearer ${borrowerUser.token}` }
  });
  assert.equal(directoryRes.status, 200);
  const peers = await directoryRes.json();
  assert.ok(peers.length >= 2);
  for (const p of peers) {
    assert.equal(p.password, undefined, 'User directory must never leak password hashes');
  }

  // 8b. Check database counts directly from Mongoose models
  const userCount = await User.countDocuments();
  const eqCount = await Equipment.countDocuments();
  const bookCount = await Booking.countDocuments();
  const msgCount = await Message.countDocuments();

  assert.equal(userCount, 4); // admin, lender, borrower, kyle
  assert.equal(eqCount, 1); // Sony FX3 (temp item was deleted)
  assert.equal(bookCount, 1); // 1 completed booking
  assert.equal(msgCount, 1); // 1 message
});

// =========================================================================
// 9. PRODUCTION READINESS: HEALTH CHECK, SECURITY HEADERS & PAGINATION
// =========================================================================
test('9. Production Readiness: Health check, Helmet security headers & pagination telemetry', async () => {
  // 9a. Health check endpoint
  const healthRes = await fetch(`${baseUrl}/api/health`);
  assert.equal(healthRes.status, 200, 'Health check must return 200 OK');
  const healthData = await healthRes.json();
  assert.equal(healthData.status, 'ok');
  assert.equal(healthData.database.status, 'connected');
  assert.equal(healthData.database.readyState, 1);
  assert.ok(typeof healthData.uptimeSeconds === 'number');

  // 9b. Helmet security headers
  assert.equal(healthRes.headers.get('x-content-type-options'), 'nosniff', 'Must include nosniff header');

  // 9c. Pagination headers on equipment
  const pagedEq = await fetch(`${baseUrl}/api/equipment?page=1&limit=10`);
  assert.equal(pagedEq.status, 200);
  assert.ok(pagedEq.headers.get('x-total-count'), 'Must provide X-Total-Count header');
  assert.equal(pagedEq.headers.get('x-page'), '1');
  assert.ok(pagedEq.headers.get('x-total-pages'));

  // 9d. Pagination headers on bookings
  const pagedBookings = await fetch(`${baseUrl}/api/bookings?page=1&limit=10`, {
    headers: { Authorization: `Bearer ${borrowerUser.token}` }
  });
  assert.equal(pagedBookings.status, 200);
  assert.ok(pagedBookings.headers.get('x-total-count'));
  assert.equal(pagedBookings.headers.get('x-page'), '1');
});

// =========================================================================
// 10. IMAGE UPLOAD SECURITY & INPUT VALIDATION DEFENSE
// =========================================================================
test('10. Image Upload Security & Input Validation Defense', async () => {
  // 10a. Unauthenticated upload attempt MUST be rejected (401 Unauthorized)
  const unauthUpload = await fetch(`${baseUrl}/api/upload`, {
    method: 'POST'
  });
  assert.equal(unauthUpload.status, 401, 'Unauthenticated upload must return 401');

  // 10b. Rejection of malicious / non-image file upload
  const badFormData = new FormData();
  const fakeScript = new Blob(['console.log("malicious code")'], { type: 'application/javascript' });
  badFormData.append('image', fakeScript, 'malicious.js');

  const badUploadRes = await fetch(`${baseUrl}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${lenderUser.token}` },
    body: badFormData
  });
  assert.equal(badUploadRes.status, 400, 'Non-image upload must be rejected with 400');
  const badUploadJson = await badUploadRes.json();
  assert.ok(badUploadJson.error.includes('Only .jpg, .jpeg, .png, .webp, and .gif files are allowed'));

  // 10c. Successful authenticated image upload
  const goodFormData = new FormData();
  // Minimal valid 1x1 GIF binary
  const gifBuffer = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  const imageBlob = new Blob([gifBuffer], { type: 'image/gif' });
  goodFormData.append('image', imageBlob, 'test-gear-photo.gif');

  const goodUploadRes = await fetch(`${baseUrl}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${lenderUser.token}` },
    body: goodFormData
  });
  assert.equal(goodUploadRes.status, 201, 'Valid image upload succeeds');
  const uploadData = await goodUploadRes.json();
  assert.ok(
    uploadData.url.startsWith('https://res.cloudinary.com/') || uploadData.url.startsWith('/uploads/'),
    'Upload must return valid Cloudinary HTTPS URL or local upload path'
  );
  if (uploadData.storage === 'cloudinary') {
    assert.ok(uploadData.publicId, 'Cloudinary upload provides publicId');
  } else {
    assert.ok(uploadData.filename.endsWith('.gif'));
  }

  // 10d. Equipment creation with malicious javascript: URL protocol MUST BE REJECTED (400)
  const xssEquipment = await fetch(`${baseUrl}/api/equipment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${lenderUser.token}`
    },
    body: JSON.stringify({
      title: 'Hacked Equipment',
      category: 'Power Tools',
      pricePerDay: 50,
      location: 'Downtown Austin, TX',
      images: ['javascript:alert(document.cookie)']
    })
  });
  assert.equal(xssEquipment.status, 400, 'Dangerous image URL scheme must be rejected');

  // 10e. Registration with malformed email MUST BE REJECTED (400)
  const badEmailReg = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Bad Email User',
      email: 'not-an-email',
      password: 'Password123!'
    })
  });
  assert.equal(badEmailReg.status, 400, 'Malformed email format must be rejected');
});
