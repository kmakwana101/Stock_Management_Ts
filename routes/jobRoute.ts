import express from 'express';
const router = express.Router();

import {
    addJob,
    getJobList,
    updateJob,
    deleteJob,
    assignJob,
    jobProcessStatus,
    completeJob
} from '../controllers/jobController'

import { isAuthenticated } from '../middlewares/isAuth';
import { upload } from '../utils/multer';
// const { upload } = require('../utils/multer');

router.post('/addJob', upload.any() , isAuthenticated , addJob)
router.get('/getJobList', isAuthenticated, getJobList)
router.put('/updateJob', isAuthenticated, updateJob)
router.delete('/deleteJob', isAuthenticated, deleteJob)
router.post('/assignJob', isAuthenticated, assignJob)
router.post('/jobProcessStatus', isAuthenticated, jobProcessStatus)
router.post('/completeJob', isAuthenticated, completeJob)

export default router;