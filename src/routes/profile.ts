import express from "express"

import { uploadAvatarWorker } from "../controllers"
import { uploadDisk } from "../middlewares/multer"

export const profileRouter = express.Router()
profileRouter.post("/avatar", uploadDisk, uploadAvatarWorker)
