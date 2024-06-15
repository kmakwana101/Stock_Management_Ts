import express from "express";
import { isAuthenticated } from "../middlewares/isAuth";
var router = express.Router();

import { addColor , getColors } from '../controllers/colorController';

router.post('/addColor',isAuthenticated , addColor)
router.get('/getColors',isAuthenticated , getColors)


export default router;
