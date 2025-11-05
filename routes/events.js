import express from "express";
import db from "../db/config.js";
import { ObjectId } from "mongodb";

const router = express.Router();

// Helpers
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

async function getEventStats(eventId) {
    const pipeline = [
        { $unwind: "$events" },
        { $match: { "events.eventId": new ObjectId(eventId) } },
        { $group: { _id: "$events.eventId", avg: { $avg: "$events.rating" }, count: { $sum: 1 } } }
    ];

    const result = await db.collection("users").aggregate(pipeline).toArray();
    if (result.length === 0) return { avg: null, count: 0 };
    return { avg: result[0].avg, count: result[0].count };
}

// 3 - create event (existing implementation kept, but accept body as well)
router.post("/", async (req, res) => {
    try {
        // Support creating via body (preferred) or via query as before
        const payload = Object.keys(req.body).length ? req.body : req.query;
        const { changeDate, establishmentID, establishmentName, address, zipCode, county } = payload;

        if (!changeDate || !establishmentID || !establishmentName || !address || !zipCode || !county) {
            res.status(400).send({ error: "Missing required fields" });
            return;
        }

        const result = await db.collection('events').insertOne({
            changeDate,
            establishmentID,
            establishmentName,
            address,
            zipCode,
            county
        });

        res.status(201).send(result);
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

// 1 - GET /events (with pagination)
router.get("/", async (req, res) => {
    try {
        const { page, limit, skip } = parsePageLimit(req);
        const cursor = db.collection("events").find({}).skip(skip).limit(limit);
        const items = await cursor.toArray();

        const total = await db.collection("events").countDocuments();
        res.send({ page, limit, total, items });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

// 5 and 14 - GET /events/:idOrYear
// If param is a valid ObjectId -> treat as id (endpoint 5). If param is a 4-digit year -> treat as year (endpoint 14).
router.get("/:idOrYear", async (req, res) => {
    try {
        const p = req.params.idOrYear;
        // If it's an ObjectId treat as event id
        if (isValidObjectId(p)) {
            const event = await db.collection("events").findOne({ _id: new ObjectId(p) });
            if (!event) {
                res.status(404).send({ error: "Event not found" });
                return;
            }

            const stats = await getEventStats(p);
            event.averageScore = stats.avg;
            event.reviewsCount = stats.count;
            res.send(event);
            return;
        }

        // If year (simple check)
        if (/^\d{4}$/.test(p)) {
            const year = parseInt(p);
            // find distinct eventIds that have reviews in the year
            const pipeline = [
                { $unwind: "$events" },
                { $addFields: { year: { $year: { $toDate: "$events.ratedAt" } } } },
                { $match: { year: year } },
                { $group: { _id: "$events.eventId" } }
            ];
            const ids = await db.collection("users").aggregate(pipeline).toArray();
            const eventIds = ids.map(d => d._id);
            const events = await db.collection("events").find({ _id: { $in: eventIds } }).toArray();
            res.send({ year, events });
            return;
        }

        res.status(400).send({ error: "Parameter must be a valid ObjectId or a 4-digit year" });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

// 7 - DELETE /events/:id
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            res.status(400).send({ error: "Invalid id" });
            return;
        }
        const result = await db.collection("events").deleteOne({ _id: new ObjectId(id) });
        // remove references from users
        await db.collection("users").updateMany({}, { $pull: { events: { eventId: new ObjectId(id) } } });
        if (result.deletedCount === 0) {
            res.status(404).send({ error: "Event not found" });
            return;
        }
        res.send({ deleted: true });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

// 9 - PUT /events/:id (update event)
// TODO

// 11 - GET /events/top/:limit
router.get("/top/:limit", async (req, res) => {
    try {
        const limit = parseInt(req.params.limit) || 10;
        const pipeline = [
            { $unwind: "$events" },
            { $group: { _id: "$events.eventId", avgScore: { $avg: "$events.rating" }, reviews: { $sum: 1 } } },
            { $sort: { avgScore: -1 } },
            { $limit: limit },
            { $lookup: { from: "events", localField: "_id", foreignField: "_id", as: "event" } },
            { $unwind: "$event" },
            { $project: { event: 1, avgScore: 1, reviews: 1 } }
        ];
        const results = await db.collection("users").aggregate(pipeline).toArray();
        res.send(results.map(r => ({ ...r.event, averageScore: r.avgScore, reviewsCount: r.reviews })));
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

// 12 - GET /events/ratings/:order  (order = asc|desc)
router.get("/ratings/:order", async (req, res) => {
    try {
        const order = req.params.order === "asc" ? 1 : -1;
        const pipeline = [
            { $unwind: "$events" },
            { $group: { _id: "$events.eventId", reviews: { $sum: 1 } } },
            { $sort: { reviews: order } },
            { $lookup: { from: "events", localField: "_id", foreignField: "_id", as: "event" } },
            { $unwind: "$event" },
            { $project: { event: 1, reviews: 1 } }
        ];
        const results = await db.collection("users").aggregate(pipeline).toArray();
        res.send(results.map(r => ({ ...r.event, reviewsCount: r.reviews })));
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

// 13 - GET /events/star  -> events with number of 5-star reviews (sorted desc)
router.get("/star", async (req, res) => {
    try {
        const pipeline = [
            { $unwind: "$events" },
            { $match: { "events.rating": 5 } },
            { $group: { _id: "$events.eventId", fiveStars: { $sum: 1 } } },
            { $sort: { fiveStars: -1 } },
            { $lookup: { from: "events", localField: "_id", foreignField: "_id", as: "event" } },
            { $unwind: "$event" },
            { $project: { event: 1, fiveStars: 1 } }
        ];
        const results = await db.collection("users").aggregate(pipeline).toArray();
        res.send(results.map(r => ({ ...r.event, fiveStarsCount: r.fiveStars })));
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

export default router;