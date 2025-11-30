#!/usr/bin/env node
/*
Seeder script for ADADProject

Usage:
  - Install deps: `cd backend; npm install`
  - Run: `npm run seed` or `API_BASE=http://localhost:3000 EVENTS=50 USERS=30 node scripts/dummyData.js`

This script will:
  1. Create events via POST /events
  2. Create users via POST /users
  3. Add reviews via POST /users/{id}/review/{event_id}
*/

import fetch from 'node-fetch';
import { faker } from '@faker-js/faker';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const EVENTS = parseInt(process.env.EVENTS || '50', 10);
const USERS = parseInt(process.env.USERS || '30', 10);
const MAX_REVIEWS_PER_USER = parseInt(process.env.MAX_REVIEWS_PER_USER || '8', 10);

async function postJSON(path, body) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch (e) {
    return { status: res.status, body: text };
  }
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function createEvents(count) {
  const created = [];
  console.log(`Creating ${count} events...`);
  for (let i = 0; i < count; i++) {
    const event = {
      changeDate: faker.date.past({ years: 3 }).toISOString(),
      establishmentID: faker.datatype.uuid(),
      establishmentName: faker.company.name(),
      address: `${faker.address.streetAddress()}, ${faker.address.city()}`,
      zipCode: faker.address.zipCode(),
      county: faker.address.county(),
    };

    const { status, body } = await postJSON('/events', event);
    if (status >= 200 && status < 300) {
      // Try to find returned id
      const id = body && (body._id || body.id || body.insertedId || (body.insertedIds && body.insertedIds[0]));
      if (id) {
        created.push(String(id));
      } else if (body && typeof body === 'object') {
        // If API returns the full event, try to read _id
        created.push(String(body._id || body.id || ''));
      } else {
        console.warn('Created event but could not parse id, storing empty placeholder');
        created.push('');
      }
    } else {
      console.error('Failed to create event', status, body);
    }
    if ((i + 1) % 10 === 0) process.stdout.write(`.${i + 1}`);
  }
  console.log('\nFinished creating events.');
  return created.filter(Boolean);
}

async function createUser(userObj) {
  const { status, body } = await postJSON('/users', userObj);
  if (status >= 200 && status < 300) {
    // Return any id if provided by the API for logging
    if (body == null) return null;
    if (Array.isArray(body) && body.length > 0) return body[0]._id || body[0].id || body[0].insertedId || null;
    return body._id || body.id || body.insertedId || (body.insertedIds && body.insertedIds[0]) || null;
  }
  console.error('Failed to create user', status, body);
  return null;
}

async function seed() {
  try {
    const eventIds = await createEvents(EVENTS);
    if (!eventIds.length) {
      console.error('No events created; aborting user creation.');
      return;
    }

    console.log(`Creating ${USERS} users (with embedded event reviews)...`);
    for (let i = 0; i < USERS; i++) {
      // Build user base
      const userBase = {
        name: faker.person.fullName(),
        gender: Math.random() > 0.5 ? 'M' : 'F',
        age: randInt(18, 80),
        occupation: faker.person.jobTitle(),
      };

      // Decide how many reviews this user will have
      const reviewsCount = randInt(0, MAX_REVIEWS_PER_USER);
      const used = new Set();
      const reviews = [];
      for (let r = 0; r < reviewsCount; r++) {
        let idx;
        do {
          idx = randInt(0, eventIds.length - 1);
        } while (used.has(idx) && used.size < eventIds.length);
        used.add(idx);
        const eventId = eventIds[idx];
        const rating = randInt(0, 5);
        const date = faker.date.recent({ days: 365 }).toISOString();
        reviews.push({ eventId: String(eventId), rating, timestamp: Date.parse(date), date });
      }

      const userObj = { ...userBase, events: reviews };
      const userId = await createUser(userObj);
      if (!userId) {
        // still continue; we logged the error in createUser
      }

      if ((i + 1) % 10 === 0) process.stdout.write(`.${i + 1}`);
    }

    console.log('\nSeeding finished.');
  } catch (err) {
    console.error('Seeder error', err);
  }
}

seed();
