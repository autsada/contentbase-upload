import workerpool from "workerpool"

import { uploadAvatar } from "../controllers/profile"
import {
  uploadFollowsMetadata,
  uploadPublishMetadata,
} from "../controllers/metadata"
import { uploadVideo, uploadThumbnail } from "../controllers/publish"

// create a worker and register public functions
workerpool.worker({
  uploadAvatar,
  uploadFollowsMetadata,
  uploadVideo,
  uploadPublishMetadata,
  uploadThumbnail,
})
