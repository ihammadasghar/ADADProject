import express from "express";
import db from "../db/config.js";
import { ObjectId } from "mongodb";

const router = express.Router();

function parsePageLimit(req) {
	const page = Math.max(1, parseInt(req.query.page) || 1);
	const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
	const skip = (page - 1) * limit;
	return { page, limit, skip };
}

function isValidObjectId(id) {
	if (!id) return false;
	try {
		return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
	} catch (e) {
		return false;
	}
}

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

		// normalize eventIds if present
		for (const u of toInsert) {
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

// 6 - GET /users/:id  (include top 3 events of the user)
//TODO : change "movies" to "events"
router.get("/:id", async (req, res) => {
	try {
		const id = req.params.id;
		console.log("Fetching user with id:", id);

		const { movies/*events*/, ...user } = await db.collection("users").findOne({ _id: Number(id) });
		if (!user) {
			res.status(404).send({ error: "User not found" });
			return;
		}

		const sorted = movies/*events*/.sort((a, b) =>  b.rating - a.rating).slice(0, 3).map(e => e.movieid/*_id*/);
		const bestRatedEvents = await db.collection("movies"/*"events"*/).find({ _id: { $in: sorted } }).toArray();
	

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
		if (!isValidObjectId(id)) {
			res.status(400).send({ error: "Invalid id" });
			return;
		}
		const result = await db.collection("users").deleteOne({ _id: new ObjectId(id) });
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
		if (!isValidObjectId(id)) {
			res.status(400).send({ error: "Invalid id" });
			return;
		}

		const body = req.body || {};
		// if events provided, normalize eventId to ObjectId when valid
		if (Array.isArray(body.events)) {
			body.events = body.events.map(e => ({
				eventId: isValidObjectId(String(e.eventId)) ? new ObjectId(e.eventId) : e.eventId,
				rating: e.rating,
				ratedAt: e.ratedAt || new Date().toISOString()
			}));
		}

		const result = await db.collection("users").updateOne({ _id: new ObjectId(id) }, { $set: body });
		if (result.matchedCount === 0) {
			res.status(404).send({ error: "User not found" });
			return;
		}
		const updated = await db.collection("users").findOne({ _id: new ObjectId(id) });
		res.send(updated);
	} catch (error) {
		console.error(error);
		res.status(500).send({ error: "Internal Server Error" });
	}
});

// 15 - POST /users/:id/review/:event_id  -> add a new review (or update existing) to an event by a user
// TODO

export default router;