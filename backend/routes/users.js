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

		// Get the next available user ID
		const maxUser = await db.collection("users").find().sort({_id: -1}).limit(1).toArray();
		let nextId = maxUser.length > 0 ? maxUser[0]._id + 1 : 1;

		// Process each user to insert
		for (const u of toInsert) {
			// Assign next available ID if not provided, or convert to integer if provided
			u._id = u._id ? parseInt(u._id) : nextId++;
			
			if (Array.isArray(u.events)) {
				u.events = u.events.map(e => ({
					eventId: isValidObjectId(String(e.eventId)) ? new ObjectId(e.eventId) : e.eventId,
					rating: e.rating,
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
		// if events array provided, normalize the data
		if (Array.isArray(body.events)) {
			body.events = body.events.map(e => ({
				eventId: isValidObjectId(String(e.eventId)) ? new ObjectId(e.eventId) : e.eventId,
				rating: e.rating,
				timestamp: e.timestamp || new Date().getTime(),
				date: e.date ? new Date(e.date) : new Date()
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