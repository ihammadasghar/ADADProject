import express from "express";
import db from "../db/config.js";
import { ObjectId } from "mongodb";

const router = express.Router();

// ===== EVENTS ENDPOINTS =====

// Endpoint 1: GET /events - Lista de eventos com paginação
router.get("/", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        let results = await db.collection('events').find({})
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await db.collection('events').countDocuments();
        
        res.status(200).send({
            data: results,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

// Endpoint 5: GET /events/:id - Pesquisar evento pelo _id com average score
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!ObjectId.isValid(id)) {
            res.status(400).send({ error: "Invalid event ID format" });
            return;
        }

        const event = await db.collection('events').findOne({
            _id: new ObjectId(id)
        });

        if (!event) {
            res.status(404).send({ error: "Event not found" });
            return;
        }

        // Calculate average score if reviews exist
        let averageScore = 0;
        if (event.reviews && event.reviews.length > 0) {
            const totalScore = event.reviews.reduce((sum, review) => sum + review.rating, 0);
            averageScore = totalScore / event.reviews.length;
        }

        res.status(200).send({
            ...event,
            averageScore: Math.round(averageScore * 100) / 100 // Round to 2 decimal places
        });
    } catch (error) {
        console.error("Error fetching event:", error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

// Endpoint 11: GET /events/top/:limit - Lista de eventos com maior score
router.get("/top/:limit", async (req, res) => {
    try {
        const limit = parseInt(req.params.limit) || 10;
        
        const events = await db.collection('events').find({}).toArray();
        
        // Calculate average score for each event and sort
        const eventsWithScores = events.map(event => {
            let averageScore = 0;
            if (event.reviews && event.reviews.length > 0) {
                const totalScore = event.reviews.reduce((sum, review) => sum + review.rating, 0);
                averageScore = totalScore / event.reviews.length;
            }
            
            return {
                ...event,
                averageScore: Math.round(averageScore * 100) / 100
            };
        });
        
        // Sort by average score descending and limit results
        const topEvents = eventsWithScores
            .filter(event => event.averageScore > 0) // Only events with reviews
            .sort((a, b) => b.averageScore - a.averageScore)
            .slice(0, limit);

        res.status(200).send(topEvents);
    } catch (error) {
        console.error("Error fetching top events:", error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

// Endpoint 14: GET /events/:year - Lista de eventos avaliados no ano {year}
router.get("/year/:year", async (req, res) => {
    try {
        const year = parseInt(req.params.year);
        
        if (isNaN(year)) {
            res.status(400).send({ error: "Invalid year format" });
            return;
        }

        const events = await db.collection('events').find({}).toArray();
        
        // Filter events that have reviews in the specified year
        const eventsInYear = events.filter(event => {
            if (!event.reviews) return false;
            
            return event.reviews.some(review => {
                const reviewYear = new Date(review.date).getFullYear();
                return reviewYear === year;
            });
        });

        res.status(200).send(eventsInYear);
    } catch (error) {
        console.error("Error fetching events by year:", error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

// Endpoint 3: POST /events - Adicionar 1 ou vários eventos
router.post("/", async (req, res) => {
    try {
        const events = req.body;
        
        // Check if it's a single event or multiple events
        if (Array.isArray(events)) {
            // Multiple events
            if (events.length === 0) {
                res.status(400).send({ error: "Empty events array" });
                return;
            }
            
            const result = await db.collection('events').insertMany(events);
            res.status(201).send(result);
        } else {
            // Single event
            const { changeDate, establishmentID, establishmentName, address, zipCode, county } = events;
            
            if (!changeDate || !establishmentID || !establishmentName || !address || !zipCode || !county) {
                res.status(400).send({ error: "Missing required fields" });
                return;
            }
            
            const result = await db.collection('events').insertOne(events);
            res.status(201).send(result);
        }
    } catch (error) {
        console.error("Error creating event(s):", error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

// Endpoint 7: DELETE /events/:id - Remover evento pelo _id
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!ObjectId.isValid(id)) {
            res.status(400).send({ error: "Invalid event ID format" });
            return;
        }

        const result = await db.collection('events').deleteOne({
            _id: new ObjectId(id)
        });

        if (result.deletedCount === 0) {
            res.status(404).send({ error: "Event not found" });
            return;
        }

        res.status(200).send({ message: "Event deleted successfully" });
    } catch (error) {
        console.error("Error deleting event:", error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

// Endpoint 9: PUT /events/:id - Update evento
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        if (!ObjectId.isValid(id)) {
            res.status(400).send({ error: "Invalid event ID format" });
            return;
        }

        if (Object.keys(updateData).length === 0) {
            res.status(400).send({ error: "No update data provided" });
            return;
        }

        const result = await db.collection('events').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            res.status(404).send({ error: "Event not found" });
            return;
        }

        res.status(200).send({ message: "Event updated successfully" });
    } catch (error) {
        console.error("Error updating event:", error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

export default router;