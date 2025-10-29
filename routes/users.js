import express from "express";
import db from "../db/config.js";
import { ObjectId } from "mongodb";

const router = express.Router();

// Endpoint 2: GET /users - Lista de users com paginação
router.get("/", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        let results = await db.collection('users').find({})
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await db.collection('users').countDocuments();
        
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
        console.error("Error fetching users:", error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

// Endpoint 6: GET /users/:id - Pesquisar user pelo _id com top 3 eventos
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!ObjectId.isValid(id)) {
            res.status(400).send({ error: "Invalid user ID format" });
            return;
        }

        const user = await db.collection('users').findOne({
            _id: new ObjectId(id)
        });

        if (!user) {
            res.status(404).send({ error: "User not found" });
            return;
        }

        // Get user's reviews and find top 3 events by rating
        let topEvents = [];
        if (user.reviews && user.reviews.length > 0) {
            // Sort reviews by rating descending and take top 3
            const topReviews = user.reviews
                .sort((a, b) => b.rating - a.rating)
                .slice(0, 3);

            // Get event details for top reviews
            topEvents = await Promise.all(
                topReviews.map(async (review) => {
                    const event = await db.collection('events').findOne({
                        _id: new ObjectId(review.eventId)
                    });
                    return {
                        event: event,
                        userRating: review.rating,
                        reviewDate: review.date
                    };
                })
            );
        }

        res.status(200).send({
            ...user,
            topEvents: topEvents
        });
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

// Endpoint 4: POST /users - Adicionar 1 ou vários utilizadores
router.post("/", async (req, res) => {
    try {
        const users = req.body;
        
        // Check if it's a single user or multiple users
        if (Array.isArray(users)) {
            // Multiple users
            if (users.length === 0) {
                res.status(400).send({ error: "Empty users array" });
                return;
            }
            
            const result = await db.collection('users').insertMany(users);
            res.status(201).send(result);
        } else {
            // Single user
            const { name, email, location, joinDate } = users;
            
            if (!name || !email) {
                res.status(400).send({ error: "Missing required fields: name and email" });
                return;
            }
            
            const result = await db.collection('users').insertOne(users);
            res.status(201).send(result);
        }
    } catch (error) {
        console.error("Error creating user(s):", error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

// Endpoint 8: DELETE /users/:id - Remover user pelo _id
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!ObjectId.isValid(id)) {
            res.status(400).send({ error: "Invalid user ID format" });
            return;
        }

        const result = await db.collection('users').deleteOne({
            _id: new ObjectId(id)
        });

        if (result.deletedCount === 0) {
            res.status(404).send({ error: "User not found" });
            return;
        }

        res.status(200).send({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

// Endpoint 10: PUT /users/:id - Update user
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        if (!ObjectId.isValid(id)) {
            res.status(400).send({ error: "Invalid user ID format" });
            return;
        }

        if (Object.keys(updateData).length === 0) {
            res.status(400).send({ error: "No update data provided" });
            return;
        }

        const result = await db.collection('users').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            res.status(404).send({ error: "User not found" });
            return;
        }

        res.status(200).send({ message: "User updated successfully" });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

export default router;