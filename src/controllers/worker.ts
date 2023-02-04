import workerpool from "workerpool"

import { avatarUpload } from "./profile"

// create a worker and register public functions
workerpool.worker({
  avatarUpload,
})
