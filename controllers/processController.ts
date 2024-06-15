import { PROCESS } from "../models/processModel";
import { Request, Response } from 'express';

export const addProcess = async (req : Request, res : Response) => {

    try {

        const { name } = req.body;

        if (!name) throw new Error('name is required.');

        let findProcess = await PROCESS.findOne({ name: name, organizationId: req.organizationId, isDeleted: false });

        if (findProcess) throw new Error('process is already exists.')

        const newProcess = await PROCESS.create({
            name,
            organizationId: req.organizationId,
            isDeleted: false
        })

        res.status(201).json({
            status: 201,
            message: 'process create Successfully',
            data: newProcess
        });

    } catch (error : any) {
        res.status(400).json({
            status: "Failed",
            message: error.message,
        });
    }
}

export const getProcess = async (req : Request, res : Response) => {

    try {

        const allProcess = await PROCESS.find({
            organizationId: req.organizationId,
            isDeleted: false
        })

        res.status(200).json({
            status: 201,
            message: 'process get Successfully',
            data: allProcess
        });

    } catch (error : any) {
        res.status(400).json({
            status: "Failed",
            message: error.message,
        });
    }
}
