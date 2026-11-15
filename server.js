const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Email Transporter (uses environment variables or fallback)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password-here'
  }
});

// Initialize SQLite Database
const db = new DatabaseSync('travels.db');
db.exec('PRAGMA foreign_keys = ON;');

// 1. Create Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    destination TEXT NOT NULL,
    category TEXT NOT NULL,
    duration TEXT NOT NULL,
    price_usd REAL NOT NULL,
    rating REAL NOT NULL,
    reviews_count INTEGER DEFAULT 0,
    image_url TEXT NOT NULL,
    badge TEXT,
    highlights TEXT NOT NULL,
    itinerary TEXT NOT NULL,
    included TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference_code TEXT UNIQUE NOT NULL,
    package_id INTEGER NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    travel_date TEXT NOT NULL,
    guests INTEGER NOT NULL,
    currency TEXT NOT NULL,
    total_amount REAL NOT NULL,
    payment_method TEXT NOT NULL,
    special_requests TEXT,
    status TEXT DEFAULT 'CONFIRMED',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (package_id) REFERENCES packages(id)
  );
`);

// 2. Seed Initial Packages
const countPackages = db.prepare('SELECT COUNT(*) AS count FROM packages').get();
if (countPackages.count === 0) {
  const insertPkg = db.prepare(`
    INSERT INTO packages (
      title, destination, category, duration, price_usd, rating, reviews_count,
      image_url, badge, highlights, itinerary, included
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seedData = [
    {
      title: "Maasai Mara Great Migration Safari",
      destination: "Maasai Mara, Kenya",
      category: "Safari",
      duration: "4 Days / 3 Nights",
      price_usd: 850,
      rating: 4.9,
      reviews_count: 142,
      image_url: "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=900&q=80",
      badge: "Bestseller",
      highlights: JSON.stringify(["Big Five Game Drives", "Mara River Crossing", "Luxury Tented Camp", "Maasai Village Visit"]),
      itinerary: JSON.stringify([
        { day: "Day 1", title: "Nairobi to Maasai Mara", desc: "Scenic drive through the Great Rift Valley with an afternoon sunset game drive." },
        { day: "Day 2", title: "Full-Day Mara River Expedition", desc: "Track lions, cheetahs, and wildebeest herds with a bush picnic lunch." },
        { day: "Day 3", title: "Hot Air Balloon & Cultural Immersion", desc: "Optional sunrise balloon safari followed by an authentic Maasai cultural experience." },
        { day: "Day 4", title: "Morning Game Drive & Return", desc: "Early predator tracking before returning to Nairobi by afternoon." }
      ]),
      included: JSON.stringify(["4x4 Land Cruiser Transport", "Full-Board Luxury Accommodation", "All Park Entry Fees", "Professional English-Speaking Guide"])
    },
    {
      title: "Diani Beach & Wasini Island Escape",
      destination: "Diani & Kwale, Kenya",
      category: "Beach",
      duration: "5 Days / 4 Nights",
      price_usd: 620,
      rating: 4.8,
      reviews_count: 98,
      image_url: "https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?auto=format&fit=crop&w=900&q=80",
      badge: "Coastal Bliss",
      highlights: JSON.stringify(["White Sand Beaches", "Kisite Marine Snorkeling", "Dolphin Spotting Dhow", "Seafood Feast"]),
      itinerary: JSON.stringify([
        { day: "Day 1", title: "Arrival in Diani", desc: "VIP transfer to your beachfront resort and sunset cocktail by the Indian Ocean." },
        { day: "Day 2", title: "Wasini Island & Dolphin Cruise", desc: "Full-day traditional dhow sail, snorkeling at Kisite-Mpunguti Marine Park, and crab lunch." },
        { day: "Day 3", title: "Leisure & Water Sports", desc: "Relax on Diani Beach or try kitesurfing, jet-skiing, and glass-bottom boat rides." },
        { day: "Day 4", title: "Shimba Hills Sunset Safari", desc: "Half-day excursion to see rare Sable antelopes and Sheldrick Falls." },
        { day: "Day 5", title: "Departure", desc: "Breakfast overlooking the ocean and transfer to Ukunda Airstrip or SGR terminus." }
      ]),
      included: JSON.stringify(["Beachfront Resort Stay", "Half-Board Meals", "Wasini Dhow & Marine Park Fees", "Airport/SGR Transfers"])
    },
    {
      title: "Mount Kenya Summit & Alpine Lakes Trek",
      destination: "Nanyuki & Mt. Kenya",
      category: "Adventure",
      duration: "5 Days / 4 Nights",
      price_usd: 740,
      rating: 4.9,
      reviews_count: 64,
      image_url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80",
      badge: "Top Rated",
      highlights: JSON.stringify(["Point Lenana (4,985m)", "Sirimon-Chogoria Route", "Lake Michaelson Views", "Certified Mountain Crew"]),
      itinerary: JSON.stringify([
        { day: "Day 1", title: "Sirimon Gate to Old Moses Camp", desc: "Hike through montane forest and bamboo zones to acclimatize at 3,300m." },
        { day: "Day 2", title: "Trek to Shipton's Camp", desc: "Cross Mackinder's Valley surrounded by giant lobelias and jagged peaks." },
        { day: "Day 3", title: "Summit Point Lenana & Descend to Mintos", desc: "Pre-dawn summit push for sunrise over Africa, descending past Hall Tarns." },
        { day: "Day 4", title: "Gorges Valley to Chogoria Bandas", desc: "Walk along dramatic cliffs overlooking Lake Michaelson." },
        { day: "Day 5", title: "Descent & Return", desc: "4x4 transfer out of the forest and return journey to Nairobi." }
      ]),
      included: JSON.stringify(["Mountain Guides, Porters & Cook", "All Camping Gear & Mountain Huts", "All Meals on the Mountain", "Kenya Wildlife Service Park Fees"])
    },
    {
      title: "Amboseli Elephants & Kilimanjaro Views",
      destination: "Amboseli, Kenya",
      category: "Safari",
      duration: "3 Days / 2 Nights",
      price_usd: 540,
      rating: 4.7,
      reviews_count: 115,
      image_url: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=900&q=80",
      badge: "Photographer's Pick",
      highlights: JSON.stringify(["Giant Tusker Elephants", "Mt. Kilimanjaro Backdrop", "Observation Hill", "Swamp Birdlife"]),
      itinerary: JSON.stringify([
        { day: "Day 1", title: "Nairobi to Amboseli", desc: "Arrive for lunch with clear views of snow-capped Kilimanjaro, followed by an evening game drive." },
        { day: "Day 2", title: "Full-Day Amboseli Exploration", desc: "Track massive elephant herds across dried lake beds and lush marshes." },
        { day: "Day 3", title: "Sunrise Photography & Departure", desc: "Golden hour game drive before heading back to Nairobi." }
      ]),
      included: JSON.stringify(["Pop-Up Roof Safari Van/Cruiser", "Full-Board Lodge Stay", "Park Conservation Fees", "Bottled Drinking Water"])
    },
    {
      title: "Zanzibar Spice Island & Stone Town Retreat",
      destination: "Zanzibar, Tanzania",
      category: "Beach",
      duration: "6 Days / 5 Nights",
      price_usd: 980,
      rating: 4.9,
      reviews_count: 183,
      image_url: "https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&w=900&q=80",
      badge: "International",
      highlights: JSON.stringify(["Historic Stone Town", "Nungwi Turquoise Waters", "Spice Farm Tour", "Prison Island Tortoises"]),
      itinerary: JSON.stringify([
        { day: "Day 1", title: "Arrival in Stone Town", desc: "Boutique hotel check-in and evening street food walk at Forodhani Gardens." },
        { day: "Day 2", title: "Stone Town & Prison Island", desc: "Guided UNESCO heritage tour and boat trip to see giant Aldabra tortoises." },
        { day: "Day 3", title: "Spice Plantation to Nungwi Beach", desc: "Sensory spice tour en route to the northern white-sand beaches." },
        { day: "Day 4", title: "Mnemba Atoll Snorkeling", desc: "Swim in crystal-clear coral reefs teeming with tropical marine life." },
        { day: "Day 5", title: "Sunset Dhow Cruise", desc: "Relax on the beach and enjoy a live-music sunset dhow sail." },
        { day: "Day 6", title: "Departure", desc: "Transfer to Abeid Amani Karume International Airport." }
      ]),
      included: JSON.stringify(["5 Nights Boutique & Beach Resorts", "Daily Breakfast & Dinners", "All Guided Excursions", "Private Airport Transfers"])
    },
    {
      title: "Lake Naivasha & Hell's Gate Cycling Adventure",
      destination: "Naivasha, Kenya",
      category: "Adventure",
      duration: "2 Days / 1 Night",
      price_usd: 260,
      rating: 4.6,
      reviews_count: 89,
      image_url: "https://images.unsplash.com/photo-1534177616072-ef7dc120449d?auto=format&fit=crop&w=900&q=80",
      badge: "Weekend Getaway",
      highlights: JSON.stringify(["Cycle Beside Zebras", "Crescent Island Walking Safari", "Naivasha Hippo Boat Ride", "Geothermal Spa"]),
      itinerary: JSON.stringify([
        { day: "Day 1", title: "Hell's Gate Cycling & Gorge Walk", desc: "Cycle past giraffes and warthogs through dramatic red cliffs, followed by a relaxing geothermal swim." },
        { day: "Day 2", title: "Boat Safari & Crescent Island", desc: "Morning boat ride among hippos and a guided walk among wildlife on Crescent Island." }
      ]),
      included: JSON.stringify(["Round-Trip Transport", "Lakeside Lodge Stay", "Mountain Bike Rental & Park Fees", "Boat Ride & Crescent Island Entry"])
    }
  ];

  for (const pkg of seedData) {
    insertPkg.run(
      pkg.title, pkg.destination, pkg.category, pkg.duration, pkg.price_usd,
      pkg.rating, pkg.reviews_count, pkg.image_url, pkg.badge,
      pkg.highlights, pkg.itinerary, pkg.included
    );
  }
  console.log('✅ Seeded 6 initial tour packages into SQLite.');
}

// ==================== API ROUTES ====================

// GET /api/packages
app.get('/api/packages', (req, res) => {
  try {
    const { category, search } = req.query;
    let query = 'SELECT * FROM packages WHERE 1=1';
    const params = [];

    if (category && category !== 'All') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search && search.trim() !== '') {
      query += ' AND (title LIKE ? OR destination LIKE ? OR category LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY id ASC';
    const rows = db.prepare(query).all(...params);

    const formatted = rows.map(row => ({
      ...row,
      highlights: JSON.parse(row.highlights),
      itinerary: JSON.parse(row.itinerary),
      included: JSON.parse(row.included)
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    console.error('Error fetching packages:', err);
    res.status(500).json({ success: false, message: 'Failed to load tour packages.' });
  }
});

// POST /api/bookings
app.post('/api/bookings', async (req, res) => {
  try {
    const {
      packageId, customerName, customerEmail, customerPhone,
      travelDate, guests, currency, paymentMethod, specialRequests
    } = req.body;

    if (!packageId || !customerName || !customerEmail || !customerPhone || !travelDate || !guests) {
      return res.status(400).json({ success: false, message: 'Please fill in all required booking fields.' });
    }

    const pkg = db.prepare('SELECT * FROM packages WHERE id = ?').get(Number(packageId));
    if (!pkg) {
      return res.status(404).json({ success: false, message: 'Selected tour package not found.' });
    }

    const EXCHANGE_RATE_KES = 130;
    const guestCount = Math.max(1, parseInt(guests, 10));
    const selectedCurrency = currency === 'KES' ? 'KES' : 'USD';
    const unitPrice = selectedCurrency === 'KES' ? pkg.price_usd * EXCHANGE_RATE_KES : pkg.price_usd;
    const totalAmount = unitPrice * guestCount;

    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const referenceCode = `SB-${new Date().getFullYear()}-${randomHex}`;

    const insertBooking = db.prepare(`
      INSERT INTO bookings (
        reference_code, package_id, customer_name, customer_email, customer_phone,
        travel_date, guests, currency, total_amount, payment_method, special_requests
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertBooking.run(
      referenceCode, pkg.id, customerName.trim(), customerEmail.trim(),
      customerPhone.trim(), travelDate, guestCount, selectedCurrency,
      totalAmount, paymentMethod || 'M-Pesa', specialRequests ? specialRequests.trim() : ''
    );

    // Send Email notification
    const mailOptions = {
      from: '"Savanna & Beyond Travels" <no-reply@savannatravels.com>',
      to: customerEmail.trim(),
      subject: `Booking Confirmed: ${pkg.title} (${referenceCode})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0B1D3A; margin-top: 0;">Jambo, ${customerName}!</h2>
          <p style="color: #475569;">Thank you for booking with <strong>Savanna & Beyond Travels</strong>. Your reservation has been confirmed.</p>
          <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Reference Code:</strong> ${referenceCode}</p>
            <p style="margin: 4px 0;"><strong>Package:</strong> ${pkg.title}</p>
            <p style="margin: 4px 0;"><strong>Travel Date:</strong> ${travelDate}</p>
            <p style="margin: 4px 0;"><strong>Total Amount:</strong> ${selectedCurrency} ${Number(totalAmount).toLocaleString()}</p>
          </div>
        </div>
      `
    };

    transporter.sendMail(mailOptions, (error) => {
      if (error) console.error('Email error (skipping if unconfigured):', error.message);
    });

    res.status(201).json({
      success: true,
      message: 'Booking confirmed and saved!',
      booking: {
        id: Number(result.lastInsertRowid),
        referenceCode,
        packageTitle: pkg.title,
        destination: pkg.destination,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        travelDate,
        guests: guestCount,
        currency: selectedCurrency,
        totalAmount,
        status: 'CONFIRMED'
      }
    });
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ success: false, message: 'Server error while saving booking.' });
  }
});

// GET /api/bookings/:reference
app.get('/api/bookings/:reference', (req, res) => {
  try {
    const ref = req.params.reference.trim().toUpperCase();
    const booking = db.prepare(`
      SELECT b.*, p.title AS package_title, p.destination, p.duration
      FROM bookings b
      JOIN packages p ON b.package_id = p.id
      WHERE b.reference_code = ?
    `).get(ref);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'No booking found with that reference code.' });
    }

    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve booking.' });
  }
});

// GET /api/admin/bookings
app.get('/api/admin/bookings', (req, res) => {
  try {
    const bookings = db.prepare(`
      SELECT b.*, p.title AS package_title, p.destination
      FROM bookings b
      JOIN packages p ON b.package_id = p.id
      ORDER BY b.created_at DESC
    `).all();

    const totalBookings = bookings.length;
    const totalRevenueUSD = bookings
      .filter(b => b.currency === 'USD' && b.status === 'CONFIRMED')
      .reduce((sum, b) => sum + b.total_amount, 0);
    const totalRevenueKES = bookings
      .filter(b => b.currency === 'KES' && b.status === 'CONFIRMED')
      .reduce((sum, b) => sum + b.total_amount, 0);

    res.json({
      success: true,
      metrics: { totalBookings, totalRevenueUSD, totalRevenueKES },
      data: bookings
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load admin data.' });
  }
});

// PATCH /api/admin/bookings/:id/status
app.patch('/api/admin/bookings/:id/status', (req, res) => {
  try {
    const bookingId = req.params.id;
    const { status } = req.body;
    const validStatuses = ['CONFIRMED', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const updateStmt = db.prepare('UPDATE bookings SET status = ? WHERE id = ?');
    const result = updateStmt.run(status, bookingId);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    res.json({ success: true, message: `Booking status updated to ${status}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update status.' });
  }
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🌍 Savanna & Beyond Travels running at http://localhost:${PORT}`);
});