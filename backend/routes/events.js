import express from "express";
import db from "../db/config.js";
import { ObjectId } from "mongodb";
import { isValidObjectId, parsePageLimit, getEventStats } from "../utils.js";

const router = express.Router();
// Endpoint 17 - GET /events/trending
// Purpose: List events that have received reviews in the last 30 days, sorted by number of recent reviews

router.get("/trending", async (req, res) => {
  try {
    const today = new Date();
    const pastMonth = new Date(today);
    pastMonth.setDate(today.getDate() - 30);

    const pipeline = [
      { $unwind: "$events" },

      { $match: { "events.ratedAt": { $gte: pastMonth } } },

      {
        $group: {
          _id: "$events.eventId",
          recentReviewCount: { $sum: 1 }
        }
      },

      { $sort: { recentReviewCount: -1 } },

      {
        $lookup: {
          from: "events",
          localField: "_id",
          foreignField: "_id",
          as: "event"
        }
      },

      { $unwind: "$event" },

      {
        $project: {
          _id: 0,
          event: "$event",
          recentReviewCount: 1
        }
      }
    ];

    const results = await db.collection("users").aggregate(pipeline).toArray();

    const trending = results.map(r => ({
      ...r.event,
      recentReviewCount: r.recentReviewCount
    }));

    res.status(200).send(trending);

  } catch (error) {
    console.error("Error fetching trending events:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});


// 3 - create event
router.post("/", async (req, res) => {
    try {
        var toInserts = req.body;
        var index = 0;
        if(Array.isArray(toInserts) === false){
            toInserts = [toInserts];
        }

        for(var event of toInserts){
            const { changeDate, establishmentID, establishmentName, address, zipCode, county } = event;

            if (!changeDate || !establishmentID || !establishmentName || !address || !zipCode || !county) {
                res.status(400).send({ error: "Missing required fields in event " + index });
                return;
            }
            index++;
        }
        
        const result = await db.collection('events').insertMany(toInserts);

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

        if (/^\d{4}$/.test(p)) {
            const year = parseInt(p);
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
router.put("/:id", async (req, res) => {
    try {
        if(!isValidObjectId(req.params.id)) {
            res.status(400).send({ error: "Invalid id" });
            return;
        }

        const result = await db.collection("events").updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });
        if (result.matchedCount === 0) {
            res.status(404).send({ error: "Event not found" });
            return;
        }
        
        res.status(200).send({ result });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

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

// Endpoint 16 - GET /events/county/:county
// Purpose: List all events in a given county, including average ratings and review counts

router.get("/county/:county", async (req, res) => {
  try {
    const county = req.params.county?.trim();
    if (!county) return res.status(400).send({ error: "Missing county name" });

    const events = await db.collection("events")
      .find({ county: { $regex: new RegExp(`^${county}$`, "i") } })
      .toArray();

    if (events.length === 0) {
      return res.status(404).send({ error: `No events found in county '${county}'` });
    }

    const eventIds = events.map(e => e._id);

    const stats = await db.collection("users").aggregate([
      { $unwind: "$events" },
      { $match: { "events.eventId": { $in: eventIds } } },
      {
        $group: {
          _id: "$events.eventId",
          avgRating: { $avg: "$events.rating" },
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    const eventsWithStats = events.map(e => {
      const s = stats.find(x => String(x._id) === String(e._id));
      return {
        ...e,
        averageScore: s ? Math.round(s.avgRating * 100) / 100 : null, // Round to 2 decimals
        reviewsCount: s ? s.count : 0
      };
    });

    // Filter events that have at least one rating
    const rated = eventsWithStats.filter(e => e.averageScore !== null);

    // Calculate the average rating across all rated events in the county
    const countyAverage = rated.length
      ? Math.round(rated.reduce((sum, e) => sum + e.averageScore, 0) / rated.length * 100) / 100
      : null;

    // Return the full response with stats
    res.status(200).send({
      county,
      totalEvents: events.length,
      countyAverage,
      events: eventsWithStats
    });

  } catch (error) {
    // Handle unexpected errors
    console.error("Error fetching county events:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

export default router;