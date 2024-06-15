import { JOB_PATTERN } from "../models/jobPatternModel";
import { PATTERN } from "../models/patternModel";
import { Request, Response } from 'express';

export const getStockList = async (req : Request, res : Response) => {
    try {

        const findAllPatterns = await PATTERN.find({ organizationId: req.organizationId })

        let stockList = []

        for (const pattern of findAllPatterns) {

            const findAllJobStatus = await JOB_PATTERN.aggregate([
                { $match: { patternId: pattern._id } }, // Filter by patternId
                { $group: { _id: "$patternId", patternNumber: { $first: pattern.patternNumber }, totalPieces: { $sum: "$piece" } } } // Group by patternId and sum pieces
            ])

            stockList.push(...findAllJobStatus)
        }

        res.status(200).json({
            status: 200,
            message: "User create successfully.",
            data : stockList
        });
    } catch (error : any) {
        res.status(400).json({
            status: "Failed",
            message: error.message,
        });
    }
}


// const stockList = await PATTERN.aggregate([
//     {
//         $match: { organizationId: req.organizationId }  // Filter by organizationId
//     },
//     {
//         $lookup: {
//             from: "job_patterns",  // Name of the JOB_PATTERN collection
//             localField: "_id",
//             foreignField: "patternId",
//             as: "jobs"
//         }
//     },
//     {
//         $unwind: "$jobs"
//     },
//     {
//         $group: {
//             _id: "$_id",
//             patternNumber: { $first: "$patternNumber" },
//             totalPieces: { $sum: "$jobs.piece" }
//         }
//     },
//     {
//         $project: {
//             patternId: "$_id",
//             patternNumber: 1,
//             totalPieces: 1,
//             _id: 0
//         }
//     }
// ]);
