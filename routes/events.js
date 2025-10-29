import express from "express";
import db from "../db/config.js";

import { ObjectId } from "mongodb";

const router = express.Router();

// return first 50 documents from events collection
router.get("/", async (req, res) => {
    let results = await db.collection('events').find({})
        .limit(50)
        .toArray();
    res.status(200).send(results);
});

// 3
router.post("/", async (req, res) => {
    try {
        const { changeDate, establishmentID, establishmentName,
            address, zipCode, county } = req.query;
            
        if(!changeDate || !establishmentID || !establishmentName
            || !address || !zipCode || !county) {

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


export default router;
