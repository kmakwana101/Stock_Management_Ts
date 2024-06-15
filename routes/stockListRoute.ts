import express from 'express';
import { isAuthenticated } from '../middlewares/isAuth';
import {
    getStockList
} from '../controllers/stockListController';

const router = express.Router();

router.get('/getStockList', isAuthenticated,getStockList)

export default router;
