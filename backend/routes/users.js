import express from "express";
import db from "../db/config.js";
import { ObjectId } from "mongodb";
import { isValidObjectId, parsePageLimit, isValidUserId } from "../utils.js";

const router = express.Router();

// 2 - GET /users (pagination)
router.get("/", async (req, res) => {
	try {
		const { page, limit, skip } = parsePageLimit(req);
		const cursor = db.collection("users").find({}).skip(skip).limit(limit);
		const items = await cursor.toArray();
		const total = await db.collection("users").countDocuments();
		res.send({ page, limit, total, items });
	} catch (error) {
		console.error(error);
		res.status(500).send({ error: "Internal Server Error" });
	}
});

// 4 - POST /users (add 1 or multiple users)
router.post("/", async (req, res) => {
	try {
		const payload = req.body;
		if (!payload) {
			res.status(400).send({ error: "Missing body" });
			return;
		}

		const toInsert = Array.isArray(payload) ? payload : [payload];

		// Basic per-user validation and collect referenced event ids
		const allEventObjectIds = [];
		for (let i = 0; i < toInsert.length; i++) {
			const u = toInsert[i];
			// Required fields: name, gender, age, occupation
			if (!u.name || !u.gender || u.age === undefined || u.age === null || !u.occupation) {
				res.status(400).send({ error: `Missing required user fields in item ${i}. Required: name, gender, age, occupation` });
				return;
			}

			// Validate gender
			if (!(u.gender === 'M' || u.gender === 'F')) {
				res.status(400).send({ error: `Invalid gender for user at index ${i}. Allowed: 'M' or 'F'` });
				return;
			}

			// Validate age
			const ageNum = Number(u.age);
			if (!Number.isFinite(ageNum) || !Number.isInteger(ageNum) || ageNum < 0 || ageNum > 150) {
				res.status(400).send({ error: `Invalid age for user at index ${i}. Must be an integer between 0 and 150` });
				return;
			}

			// Validate events array shape and collect eventIds to verify existence later
			if (Array.isArray(u.events)) {
				for (let j = 0; j < u.events.length; j++) {
					const e = u.events[j];
					if (!e || (e.eventId === undefined || e.eventId === null)) {
						res.status(400).send({ error: `Missing eventId for user index ${i} event index ${j}` });
						return;
					}

					// rating must be finite number between 0 and 5
					const rating = Number(e.rating);
					if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
						res.status(400).send({ error: `Invalid rating for user index ${i} event index ${j}. Must be number between 0 and 5` });
						return;
					}

					// eventId must be a valid ObjectId (events collection uses ObjectId _id)
					if (!isValidObjectId(String(e.eventId))) {
						res.status(400).send({ error: `Invalid eventId format for user index ${i} event index ${j}: ${String(e.eventId)}` });
						return;
					}

					allEventObjectIds.push(new ObjectId(String(e.eventId)));
				}
			}
		}

		// Verify that all referenced events actually exist in the events collection
		if (allEventObjectIds.length > 0) {
			// dedupe
			const uniqueIds = Array.from(new Set(allEventObjectIds.map(id => String(id)))).map(s => new ObjectId(s));
			const existing = await db.collection('events').find({ _id: { $in: uniqueIds } }).project({ _id: 1 }).toArray();
			const existingSet = new Set(existing.map(e => String(e._id)));
			for (let i = 0; i < toInsert.length; i++) {
				const u = toInsert[i];
				if (Array.isArray(u.events)) {
					for (let j = 0; j < u.events.length; j++) {
						const e = u.events[j];
						const oidStr = String(new ObjectId(String(e.eventId)));
						if (!existingSet.has(oidStr)) {
							res.status(400).send({ error: `Referenced event not found for user index ${i} event index ${j}: ${String(e.eventId)}` });
							return;
						}
					}
				}
			}
		}

		// Get the next available user ID
		const maxUser = await db.collection("users").find().sort({_id: -1}).limit(1).toArray();
		let nextId = maxUser.length > 0 ? maxUser[0]._id + 1 : 1;

		// Normalize events and assign _id
		for (let u of toInsert) {
			// Assign next available ID if not provided, or convert to integer if provided
			u._id = u._id ? parseInt(u._id) : nextId++;
			
			if (Array.isArray(u.events)) {
				u.events = u.events.map(e => ({
					eventId: new ObjectId(String(e.eventId)),
					rating: Number(e.rating),
					ratedAt: e.ratedAt || new Date().toISOString()
				}));
			}
		}

		const result = await db.collection("users").insertMany(toInsert);
		res.status(201).send(result);
	} catch (error) {
		console.error(error);
		res.status(500).send({ error: "Internal Server Error" });
	}
});

// Endpoint 18 - GET /users/top
// Purpose: Retrieve the top 5 most active users based on the number of reviews they've submitted

router.get("/top", async (req, res) => {
	try {
		const users = await db.collection("users").find({}).toArray();
		if (users.length === 0) {
			res.status(404).send({ error: "No users found" });
			return;
		}
		const usersWithCount = users.map(u => ({
			...u,
			reviewCount: Array.isArray(u.events) ? u.events.length : 0
		}));
		const topUsers = usersWithCount.sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 5);
		res.status(200).send({ message: "Top 5 most active users", totalUsers: users.length, topUsers });
	} catch (error) {
		console.error("Error fetching top users:", error);
		res.status(500).send({ error: "Internal Server Error" });
	}
});

// Endpoint 19 - GET /users/active/:year
// Purpose: Retrieve all users who submitted at least one review during the specified year
router.get("/active/:year", async (req, res) => {
	try {
		const year = parseInt(req.params.year);
		if (isNaN(year)) {
			res.status(400).send({ error: "Invalid year format" });
			return;
		}
		const users = await db.collection('users').find({}).toArray();
		const activeUsers = users.filter(user => {
			if (!Array.isArray(user.events)) return false;
			return user.events.some(event => {
				const date = new Date(event.ratedAt);
				return !isNaN(date) && date.getFullYear() === year;
			});
		});
		res.status(200).send({ year, activeUserCount: activeUsers.length, activeUsers });
	} catch (error) {
		console.error("Error fetching active users:", error);
		res.status(500).send({ error: "Internal Server Error" });
	}
});

// 6 - GET /users/:id  (include top 3 events of the user)
router.get("/:id", async (req, res) => {
	try {
		const id = req.params.id;

		const user = await db.collection("users").findOne({ _id: Number(id) });
		if (!user) {
			res.status(404).send({ error: "User not found" });
			return;
		}
		
		let bestRatedEvents;
		if(user.events){
			const sorted = user.events.sort((a, b) =>  b.rating - a.rating).slice(0, 3).map(e => e.eventId);
			bestRatedEvents = await db.collection("events").find({ _id: { $in: sorted } }).toArray();
		}
		else{
			bestRatedEvents = [];
		}
		
	

		res.status(200).send({ user, bestRatedEvents });
	} catch (error) {
		console.error(error);
		res.status(500).send({ error: "Internal Server Error" });
	}
});


// 8 - DELETE /users/:id
router.delete("/:id", async (req, res) => {
	try {
		const { id } = req.params;
		if (!isValidUserId(id)) {
			res.status(400).send({ error: "Invalid id" });
			return;
		}
		const result = await db.collection("users").deleteOne({ _id: parseInt(id) });
		if (result.deletedCount === 0) {
			res.status(404).send({ error: "User not found" });
			return;
		}
		res.send({ deleted: true });
	} catch (error) {
		console.error(error);
		res.status(500).send({ error: "Internal Server Error" });
	}
});

// 10 - PUT /users/:id (update user)
router.put("/:id", async (req, res) => {
	try {
		const { id } = req.params;
		if (!isValidUserId(id)) {
			res.status(400).send({ error: "Invalid id" });
			return;
		}

		const body = req.body || {};

		// Validate fields if they are provided (partial updates allowed)
		if (body.gender !== undefined) {
			if (!(body.gender === 'M' || body.gender === 'F')) {
				res.status(400).send({ error: 'Invalid gender. Allowed: "M" or "F"' });
				return;
			}
		}

		if (body.age !== undefined) {
			const ageNum = Number(body.age);
			if (!Number.isFinite(ageNum) || !Number.isInteger(ageNum) || ageNum < 0 || ageNum > 150) {
				res.status(400).send({ error: 'Invalid age. Must be an integer between 0 and 150' });
				return;
			}
			body.age = ageNum;
		}

		// If events provided, validate each entry and ensure referenced events exist
		if (Array.isArray(body.events)) {
			const allEventObjectIds = [];
			for (let j = 0; j < body.events.length; j++) {
				const e = body.events[j];
				if (!e || (e.eventId === undefined || e.eventId === null)) {
					res.status(400).send({ error: `Missing eventId for events[${j}]` });
					return;
				}

				const rating = Number(e.rating);
				if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
					res.status(400).send({ error: `Invalid rating for events[${j}]. Must be number between 0 and 5` });
					return;
				}

				if (!isValidObjectId(String(e.eventId))) {
					res.status(400).send({ error: `Invalid eventId format for events[${j}]: ${String(e.eventId)}` });
					return;
				}

				allEventObjectIds.push(new ObjectId(String(e.eventId)));
			}

			// Verify referenced events exist
			const uniqueIds = Array.from(new Set(allEventObjectIds.map(id => String(id)))).map(s => new ObjectId(s));
			const existing = await db.collection('events').find({ _id: { $in: uniqueIds } }).project({ _id: 1 }).toArray();
			const existingSet = new Set(existing.map(x => String(x._id)));
			for (let j = 0; j < body.events.length; j++) {
				const e = body.events[j];
				const oidStr = String(new ObjectId(String(e.eventId)));
				if (!existingSet.has(oidStr)) {
					res.status(400).send({ error: `Referenced event not found: events[${j}] -> ${String(e.eventId)}` });
					return;
				}
			}

			// Normalize event entries for storage
			body.events = body.events.map(e => ({
				eventId: new ObjectId(String(e.eventId)),
				rating: Number(e.rating),
				timestamp: e.timestamp || Date.now(),
				ratedAt: e.ratedAt || e.date || new Date().toISOString()
			}));
		}

		const result = await db.collection("users").updateOne({ _id: parseInt(id) }, { $set: body });
		if (result.matchedCount === 0) {
			res.status(404).send({ error: "User not found" });
			return;
		}
		const updated = await db.collection("users").findOne({ _id: parseInt(id) });
		res.send(updated);
	} catch (error) {
		console.error(error);
		res.status(500).send({ error: "Internal Server Error" });
	}
});

// 15 - POST /users/:id/review/:event_id  -> add a new review (or update existing) to an event by a user
router.post("/:id/review/:event_id", async (req, res) => {
	try {
		const { id, event_id } = req.params;

		if (!isValidObjectId(event_id)) {
		 	return res.status(400).send({ error: "Invalid event id" });
		}

	const userId = Number(id);
	// allow event_id as an ObjectId string or a number
	const eventId = isValidObjectId(String(event_id)) ? new ObjectId(event_id) : Number(event_id);

		const { rating, ratedAt } = req.body;
		const rate = Number(rating);
		if (!Number.isFinite(rate) || rate < 0 || rate > 5) {
			return res.status(400).send({ error: "Invalid rating. Must be a number between 0 and 5" });
		}

		const ratedAtValue = ratedAt ? new Date(ratedAt): new Date();
		const ratedAtRawValue = ratedAt ? new Date(ratedAt).getTime() : new Date().getTime();
	const eventExists = await db.collection("events").findOne({ _id: eventId });
		if (!eventExists) {
			return res.status(404).send({ error: "Event not found" });
		}

		var result = await db.collection("users").updateOne(
			{ _id: userId, "events.eventId": eventId },
			{ $set: { "events.$.rating": rate, "events.$.date": ratedAtValue, "events.$.timestamp": ratedAtRawValue } }
		);

		if (result.matchedCount === 0) {
			result = await db.collection("users").updateOne(
				{ _id: userId },
				{ $push: { events: { eventId: eventId, rating: rate, timestamp: ratedAtRawValue, date: ratedAtValue } } }
			);
			if (result.matchedCount === 0) {
				return res.status(404).send({ error: "User not found" });
			}
		}

		return res.status(201).send({ result });
	} catch (error) {
		console.error(error);
		res.status(500).send({ error: "Internal Server Error" });
	}
});

// Endpoint 18 - GET /users/top
// Purpose: Retrieve the top 5 most active users based on the number of reviews they've submitted

router.get("/top", async (req, res) => {
  try {
    const users = await db.collection("users").find({}).toArray();

    if (users.length === 0) {
      res.status(404).send({ error: "No users found" });
      return;
    }

    const usersWithCount = users.map(u => ({
      ...u,
      reviewCount: Array.isArray(u.events) ? u.events.length : 0
    }));

    const topUsers = usersWithCount
      .sort((a, b) => b.reviewCount - a.reviewCount)
      .slice(0, 5);
    res.status(200).send({
      message: "Top 5 most active users",
      totalUsers: users.length,
      topUsers
    });

  } catch (error) {
    // Step 6: Handle any unexpected errors
    console.error("Error fetching top users:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});
// Endpoint 19 - GET /users/active/:year
// Purpose: Retrieve all users who submitted at least one review during the specified year

router.get("/active/:year", async (req, res) => {
  try {
    const year = parseInt(req.params.year);

    if (isNaN(year)) {
      res.status(400).send({ error: "Invalid year format" });
      return;
    }

    const users = await db.collection('users').find({}).toArray();

    const activeUsers = users.filter(user => {
      if (!Array.isArray(user.events)) return false;

      return user.events.some(event => {
        const date = new Date(event.ratedAt);
        return !isNaN(date) && date.getFullYear() === year;
      });
    });
    res.status(200).send({
      year,
      activeUserCount: activeUsers.length,
      activeUsers
    });

  } catch (error) {
    // Step 6: Handle unexpected errors
    console.error("Error fetching active users:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});


export default router;