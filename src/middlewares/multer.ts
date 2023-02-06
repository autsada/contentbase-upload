import multer from "multer"
import os from "os"

export const osTempDir = os.tmpdir()
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, osTempDir)
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`)
  },
})
export const uploadDisk = multer({ storage }).single("file")
