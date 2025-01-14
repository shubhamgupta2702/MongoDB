import { Router } from "express";
import { healthCheck } from "../controllers/healthcheck.controllers.js";

const router = Router()
//  /api/v1/healthcheck --->serves here !



router.route("/").get(healthCheck)


export default router