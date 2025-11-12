import { ObjectId } from "mongodb";
import db from "./db/config.js";

export function parsePageLimit(req) {
	const page = Math.max(1, parseInt(req.query.page) || 1);
	const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
	const skip = (page - 1) * limit;
	return { page, limit, skip };
}

export function isValidObjectId(id) {
	if (!id) return false;
	try {
		return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
	} catch (e) {
		return false;
	}
}

export async function getEventStats(eventId) {
    const pipeline = [
        { $unwind: "$events" },
        { $match: { "events.eventId": new ObjectId(eventId) } },
        { $group: { _id: "$events.eventId", avg: { $avg: "$events.rating" }, count: { $sum: 1 } } }
    ];

    const result = await db.collection("users").aggregate(pipeline).toArray();
    if (result.length === 0) return { avg: null, count: 0 };
    return { avg: result[0].avg, count: result[0].count };
}

export function isValidUserId(id) {
    const parsedId = parseInt(id);
    return !isNaN(parsedId) && parsedId > 0;
}