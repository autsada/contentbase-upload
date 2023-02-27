import workerpool from "workerpool"

import { avatarUpload } from "../controllers/profile"
import { uploadVideo } from "../controllers/publish"

// create a worker and register public functions
workerpool.worker({
  avatarUpload,
  uploadVideo,
})
