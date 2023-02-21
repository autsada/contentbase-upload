import workerpool from "workerpool"
import path from "path"
import type { Request, Response, NextFunction } from "express"

import type { Environment, UploadType } from "../types"

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

export function uploadAvatarWorker(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const file = req.file
  const { uid, handle, uploadType, oldURI } = req.body as {
    uid: string
    handle: string
    uploadType: UploadType
    oldURI?: string
  }
  if (!uid || !file || !handle || uploadType) throw new Error("Bad request")

  pool
    .proxy()
    .then(function (worker) {
      return worker.avatarUpload({ uid, file, handle, uploadType, oldURI })
    })
    .then(function (result) {
      res.status(200).json({ url: result })
    })
    .catch(function (err) {
      next(err)
    })
    .then(function () {
      pool.terminate() // terminate all workers when done
    })
}
