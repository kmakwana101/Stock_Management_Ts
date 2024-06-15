import { COLOR } from "../models/colorModel";
import { Request, Response } from 'express';

export const addColor = async (req : Request, res : Response) => {
    try {
        const { name } = req.body;

        if (!name) {
            throw new Error('name is required.')
        }

        let color = await COLOR.findOne({ name: name , organizationId: req.organizationId })
        
        if (!color) {
            color = await COLOR.create({
                name,
                organizationId: req.organizationId
            })
        }

        res.status(200).json({
            status: 200,
            message: "color create Successfully.",
            data: color
        });

    } catch (error : any) {
        res.status(400).json({
            status: "Failed",
            message: error.message,
        });
    }
}

export const getColors = async (req : Request, res : Response) => {
    try {

        const allColors = await COLOR.find({
            organizationId: req.organizationId
        })

        res.status(200).json({
            status: 200,
            message: "color create Successfully.",
            data: allColors
        });

    } catch (error : any) {
        res.status(400).json({
            status: "Failed",
            message: error.message,
        });
    }
}