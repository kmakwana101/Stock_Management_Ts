import { COLOR } from "../models/colorModel";
import { JOB } from "../models/jobModel";
import { JOB_PATTERN } from "../models/jobPatternModel";
import { PATTERN } from "../models/patternModel";
import { ROLE } from "../models/roleModel";
import { USER } from "../models/userModel";
import { JOB_STATUS } from "../models/jobStatusModel";
import { PROCESS } from "../models/processModel";
import { Request, Response } from 'express';
import moment from "moment";
import mongoose from "mongoose";
import { PROFILE } from "../models/profileModel";

export const addJob = async (req: Request, res: Response) => {
    try {
        const { pharmaNumber, date, assignToId, roleArray, patternArray } = req.body;

        const formattedDate: any = moment(date, 'DD/MM/YYYY', true);

        switch (true) {
            case !pharmaNumber:
                throw new Error('pharmaNumber is required.');
            case !date:
                throw new Error('date is required.');
            case !roleArray.length:
                throw new Error('roleArray is required.');
            case !patternArray.length:
                throw new Error('patternArray is required.');
            case !formattedDate.isValid():
                throw new Error('Please provide valid date in DD/MM/YYYY format.')
            default:
        }

        let jobStatus = "Pending";
        if (assignToId) {
            let findAssignTo = await USER.findOne({ _id: assignToId, isDeleted: false, organizationId: req.organizationId })
            if (!findAssignTo) throw new Error('Assigned user not found or has been deleted.');
            jobStatus = 'Assign'
        }

        for (const role of roleArray) {
            let findColor = await COLOR.findOne({ _id: role.colorId, organizationId: req.organizationId });
            if (!findColor) throw new Error('please provide valid colorId.')
        }

        const newJob: any = await JOB.create({
            assignTo: assignToId ? assignToId : null,
            date: formattedDate.toDate('DD/MM/YYYY'),
            pharmaNumber: pharmaNumber,
            userId: req.userId,
            status: jobStatus,
            organizationId: req.organizationId,
            isDeleted: false
        })

        const newPatternArray = [], newRoleArray = [];

        for (const role of roleArray) {
            const newRole = await ROLE.create({
                colorId: role.colorId, //  color                   
                jobId: newJob._id,
                weightKg: role.weightKg,
                weightGr: role.weightGr
            })
            let findRole = await ROLE.findOne({ _id: newRole._id }).populate('colorId')
            newRoleArray.push(findRole)
        }


        for (const pattern of patternArray) {

            let find_pattern = await PATTERN.findOne({ patternNumber: pattern.patternNumber, organizationId: req.organizationId })

            if (!find_pattern) {
                find_pattern = await PATTERN.create({
                    patternNumber: pattern.patternNumber,
                    organizationId: req.organizationId,
                    isDeleted: false
                })
            }

            const newJobPattern = await JOB_PATTERN.create({
                patternId: find_pattern._id,
                jobId: newJob._id,
                piece: pattern.piece
            })

            const findPattern = await JOB_PATTERN.findOne({
                _id: newJobPattern._id
            }).populate('patternId')

            newPatternArray.push(findPattern)
        }

        let validFormate = moment(newJob.date).format('DD/MM/YYYY')

        let response = {
            ...newJob._doc,
            date: validFormate,
            patternArray: newPatternArray,
            roleArray: newRoleArray
        }

        res.status(200).json({
            status: 201,
            message: 'job created successfully',
            data: response
        });

    } catch (error: any) {
        res.status(400).json({
            status: "Failed",
            message: error.message,
        });
    }
}

export const getJobList = async (req: Request, res: Response) => {

    try {

        const response = []

        let query = Object();

        if (req.role === "owner") {
            query.organizationId = req.organizationId
        } else {
            query.organizationId = req.organizationId;
            query.assignTo = req.userId;
        }
        // { path: "userId", populate: { path: "role" } }
        const jobList: any = await JOB.find({ ...query, isDeleted: false }).populate({
            path: "assignTo",
        })

        for (const job of jobList) {

            const roleArray = await ROLE.find({ jobId: job._id }).populate('colorId')
            const patternArray = await JOB_PATTERN.find({ jobId: job._id }).populate('patternId')
            const processArray = await JOB_STATUS.find({ jobId: job._id }).populate('processId')
            let date = moment(job.date).format('DD/MM/YYYY')

            let assignTo: any;
            if (job.assignTo) {
                const findProfile = await PROFILE.findOne({ userId: job.assignTo, isDeleted: false }).populate({
                    path: "userId",
                    select: "-password"
                })
                assignTo = findProfile;
            }

            let obj = {
                ...job._doc,
                assignTo: assignTo ? assignTo : null,
                date: date,
                patternArray: patternArray,
                roleArray: roleArray,
                processArray: processArray
            }

            response.push(obj)
        }

        res.status(200).json({
            status: 201,
            message: 'job created successfully',
            data: response
        });

    } catch (error: any) {
        res.status(400).json({
            status: "Failed",
            message: error.message,
        });
    }
}

export const updateJob = async (req: Request, res: Response) => {
    try {

        const { pharmaNumber, date, assignToId, roleArray, patternArray } = req.body;
        const { jobId } = req.query;

        const formattedDate: any = moment(date, 'DD/MM/YYYY', true);

        switch (true) {
            case !jobId:
                throw new Error('jobId is required.');
            case !pharmaNumber:
                throw new Error('pharmaNumber is required.');
            case !date:
                throw new Error('date is required.');
            case !roleArray.length:
                throw new Error('roleArray is required.');
            case !patternArray.length:
                throw new Error('patternArray is required.');
            case !formattedDate.isValid():
                throw new Error('Please provide valid date in DD/MM/YYYY format.')
            default:
        }

        let job = await JOB.findOne({ _id: jobId, isDeleted: false });
        if (!job) throw new Error('Job not found.')

        let jobStatus = "Pending";
        if (assignToId) {
            let findAssignTo = await USER.findOne({ _id: assignToId, isDeleted: false, organizationId: req.organizationId })
            if (!findAssignTo) throw new Error('Assigned user not found or has been deleted.');
            jobStatus = 'Assign'
        }

        for (const role of roleArray) {
            let findColor = await COLOR.findOne({ _id: role.colorId, organizationId: req.organizationId });
            if (!findColor) throw new Error('please provide valid colorId.')
        }

        const updatedJob: any = await JOB.findOneAndUpdate(
            { _id: jobId },
            {
                $set: {
                    assignTo: assignToId ? assignToId : null,
                    date: formattedDate.toDate('DD/MM/YYYY'),
                    pharmaNumber: pharmaNumber,
                    // userId: req.userId,
                    status: jobStatus,
                    organizationId: req.organizationId,
                    isDeleted: false
                }
            },
            { new: true }
        )

        await ROLE.deleteMany({ jobId: job._id })
        await JOB_PATTERN.deleteMany({ jobId: job._id })

        const newPatternArray = [], newRoleArray = [];

        for (const role of roleArray) {
            const newRole = await ROLE.create({
                colorId: role.colorId, //  color                   
                jobId: job._id,
                weightKg: role.weightKg,
                weightGr: role.weightGr
            })
            let findRole = await ROLE.findOne({ _id: newRole._id }).populate('colorId')
            newRoleArray.push(findRole)
        }

        for (const pattern of patternArray) {

            let find_pattern = await PATTERN.findOne({ patternNumber: pattern.patternNumber, organizationId: req.organizationId })

            if (!find_pattern) {
                find_pattern = await PATTERN.create({
                    patternNumber: pattern.patternNumber,
                    organizationId: req.organizationId,
                    isDeleted: false
                })
            }

            const newJobPattern = await JOB_PATTERN.create({
                patternId: find_pattern._id,
                jobId: job._id,
                piece: pattern.piece
            })

            const findPattern = await JOB_PATTERN.findOne({
                _id: newJobPattern._id
            }).populate('patternId')

            newPatternArray.push(findPattern)
        }

        let validFormate = moment(updatedJob.date).format('DD/MM/YYYY')

        let response = {
            ...updatedJob._doc,
            date: validFormate,
            patternArray: newPatternArray,
            roleArray: newRoleArray
        }

        res.status(200).json({
            status: 201,
            message: 'job update successfully',
            data: response
        });

    } catch (error: any) {
        res.status(400).json({
            status: "Failed",
            message: error.message,
        });
    }
}

export const deleteJob = async (req: Request, res: Response) => {
    try {

        const { jobId } = req.query;

        if (!jobId) throw new Error('jobId is required in query.');

        let job = await JOB.findOne({ _id: jobId, isDeleted: false });
        if (!job) throw new Error('Job not found.')

        const deletedJob: any = await JOB.findOneAndUpdate(
            { _id: jobId },
            {
                $set: {
                    isDeleted: true,
                }
            },
            { new: true }
        )

        console.log(deletedJob)

        const deletedRoles = await ROLE.deleteMany({
            jobId: deletedJob._id
        })

        const deletedPatterns = await JOB_PATTERN.deleteMany({
            jobId: deletedJob._id
        })

        console.log(deletedPatterns, deletedRoles)

        res.status(200).json({
            status: 201,
            message: 'job delete successfully',
        });
    } catch (error: any) {
        res.status(400).json({
            status: "Failed",
            message: error.message,
        });
    }
}

export const assignJob = async (req: Request, res: Response) => {
    try {

        const { jobId, assignTo } = req.query;

        let findJob = await JOB.findOne({ _id: jobId });
        let findAssignToUser = await USER.findOne({ _id: assignTo })

        if (!findJob) throw new Error('job not found.')
        if (!findAssignToUser) throw new Error('assignTo User not found.')

        await JOB.findOneAndUpdate(
            { _id: jobId },
            {
                assignTo: assignTo,
                status: 'Assign'
            },
            { new: true }
        )

        res.status(200).json({
            status: 201,
            message: 'job assign successfully',
        });

    } catch (error: any) {
        res.status(400).json({
            status: "Failed",
            message: error.message,
        });
    }
}

export const jobProcessStatus = async (req: Request, res: Response) => {
    try {

        const { jobId, processId } = req.body;

        if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) throw new Error('please provide valid jobId.');
        if (!processId || !mongoose.Types.ObjectId.isValid(processId)) throw new Error('please provide valid processId.');

        let findJob = await JOB.findOne({ _id: jobId, organizationId: req.organizationId, isDeleted: false });
        if (!findJob) throw new Error('job not found.')

        let findProcess = await PROCESS.findOne({ _id: processId, organizationId: req.organizationId, isDeleted: false });
        if (!findProcess) throw new Error('process not found.')

        let findJobStatus = await JOB_STATUS.findOne({ jobId: jobId, processId: processId, status: "Processing" })

        let newJobStatus;

        if (findJobStatus) {

            newJobStatus = await JOB_STATUS.create({
                jobId,
                processId,
                status: "Complete",
            })

        } else {

            newJobStatus = await JOB_STATUS.create({
                jobId,
                processId,
                status: "Processing",
            })

        }

        res.status(200).json({
            status: 201,
            message: 'add process for job Successfully',
            data: newJobStatus
        });

    } catch (error: any) {
        res.status(400).json({
            status: "Failed",
            message: error.message,
        });
    }
}

export const completeJob = async (req: Request, res: Response) => {
    try {

        const { jobId } = req.query;
        if (!jobId) throw new Error('jobId is required in query.');

        const findJob = await JOB.findOne({ _id: jobId, isDeleted: false });
        if (!findJob) throw new Error('job not found.')

        let allCompletedJobProcess: any = await JOB_STATUS.find({ jobId: jobId, status: 'Complete' }).populate('processId')

        let isPackagedComplete = allCompletedJobProcess.filter((process: any) => process.processId.name === 'packaging');

        if (!isPackagedComplete.length) {
            throw new Error('The job does not have a completed packaging process.');
        }

        findJob.status = 'Complete';
        findJob.save();

        res.status(200).json({
            status: 201,
            message: 'job Complete successfully.',
        });

    } catch (error: any) {

        res.status(400).json({
            status: "Failed",
            message: error.message,
        });

    }
}