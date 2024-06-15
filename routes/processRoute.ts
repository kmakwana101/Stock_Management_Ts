import express from 'express';
import { isAuthenticated } from '../middlewares/isAuth';
import { upload } from '../utils/multer';
import {
    addProcess,
    getProcess
} from '../controllers/processController';

const router = express.Router();


router.post('/addProcess', isAuthenticated , addProcess)
router.get('/getProcess', isAuthenticated , getProcess)

export default router;
