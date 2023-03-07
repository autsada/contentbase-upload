import workerpool from "workerpool"

import { uploadAvatar } from "../controllers/profile"
import {
  uploadFollowsMetadata,
  uploadPublishMetadata,
} from "../controllers/metadata"
import { uploadVideo } from "../controllers/publish"

// create a worker and register public functions
workerpool.worker({
  uploadAvatar,
  uploadFollowsMetadata,
  uploadVideo,
  uploadPublishMetadata,
})
