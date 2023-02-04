import multer from "multer"
import os from "os"

export const osTempDir = os.tmpdir()
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, osTempDir)
  },
  filename: (req, file, cb) => {
    cb(null, `${file.originalname}-${Date.now()}`)
  },
})
export const uploadDisk = multer({ storage }).single("file")
