import express from "express"
import workerpool from "workerpool"
import path from "path"

import { uploadDisk } from "../middlewares/multer"
import type {
  Environment,
  FollowsMetadataArgs,
  UploadPublishArgs,
} from "../types"
import { verifyIdToken } from "../middlewares/verify-token"

const { NODE_ENV } = process.env

const env = NODE_ENV as Environment

// Create a worker pool to run a worker.
const pool = workerpool.pool(
  path.resolve(
    __dirname,
    env === "development" ? "worker-dev.js" : "worker.js"
  ),
  {
    minWorkers: 1,
    workerType: "thread",
  }
)

export const router = express.Router()

/**
 * A route to upload avatar image
 */
router.post("/profile/avatar", verifyIdToken, uploadDisk, (req, res) => {
  const uid = req.uid
  const file = req.file
  const { handle, oldURI } = req.body as {
    handle: string
    oldURI?: string
  }
  if (!uid || !handle) {
    res.status(400).json({ error: "Bad request" })
  } else {
    pool
      .proxy()
      .then(function (worker) {
        return worker.uploadAvatar({ uid, file, handle, oldURI })
      })
      .then(function (result) {
        res.status(200).json(result)
      })
      .catch(function (err) {
        res
          .status(err.status || 500)
          .send(err.message || "Something went wrong")
      })
      .then(function () {
        pool.terminate() // terminate all workers when done
      })
  }
})

/**
 * Create follows metadata route
 */
router.post("/metadata/follows", verifyIdToken, (req, res) => {
  const uid = req.uid
  const body = req.body as FollowsMetadataArgs
  const { follower, followee } = body

  if (!uid) {
    res.status(400).json({ error: "Bad request" })
  } else {
    pool
      .proxy()
      .then(function (worker) {
        return worker.uploadFollowsMetadata({
          follower,
          followee,
        })
      })
      .then(function (result) {
        res.status(200).json(result)
      })
      .catch(function (err) {
        res
          .status(err.status || 500)
          .send(err.message || "Something went wrong")
      })
      .then(function () {
        pool.terminate() // terminate all workers when done
      })
  }
})

router.post("/publish/video", verifyIdToken, uploadDisk, async (req, res) => {
  const uid = req.uid
  const file = req.file
  const { handle, publishId } = req.body as Omit<
    UploadPublishArgs,
    "uid" | "file" | "uploadType"
  >

  if (!uid || !file || !handle || !publishId) {
    res.status(400).json({ error: "Bad request" })
  } else {
    pool
      .proxy()
      .then(function (worker) {
        return worker.uploadVideo({ uid, handle, file, publishId })
      })
      .then(function (result) {
        res.status(200).json(result)
      })
      .catch(function (err) {
        res
          .status(err.status || 500)
          .send(err.message || "Something went wrong")
      })
      .then(function () {
        pool.terminate() // terminate all workers when done
      })
  }
})
