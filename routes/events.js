import express from "express";
import db from "../db/config.js";

import { ObjectId } from "mongodb";

const router = express.Router();
// return first 50 documents from events collection
router.get("/", async (req, res) => {
    let results = await db.collection('events').find({})
        .limit(50)
        .toArray();
    res.send(results).status(200);
});


router.get("/", async (req, res) => {
    req.params
    let results = await db.collection('events').updateOne({},
        { $set: { updated: true } });
    res.send(results).status(200);
});

export default router;
