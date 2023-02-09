import { promisify } from "util"
import fs from "fs"
import sharp from "sharp"

import { bucket } from "../firebase/config"
import { osTempDir } from "../middlewares/multer"

export async function avatarUpload({
  file,
  handle,
  storageFolder,
  oldURI,
}: {
  file: Express.Multer.File
  handle: string
  storageFolder: string
  oldURI?: string
}) {
  try {
    const filename = file.filename
    const inputFilePath = file.path
    const outputFilePath = `${osTempDir}/${filename}-${Date.now()}`

    await sharp(inputFilePath)
      .resize({ width: 640, height: 640, fit: "contain" })
      .withMetadata()
      .toFile(outputFilePath)

    // Construct destination string for the image to be saved on cloud storage
    // Make sure to `lowerCase` the handle
    const destination = `${storageFolder}/${handle.toLowerCase()}-${filename}`

    // Upload
    await bucket.upload(outputFilePath, {
      destination,
      resumable: true,
    })

    const uploadedFile = bucket.file(destination)
    const urls = await uploadedFile.getSignedUrl({
      action: "read",
      expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 1000,
    })

    const unlink = promisify(fs.unlink)
    await unlink(inputFilePath)
    await unlink(outputFilePath)

    // Delete the old file (if any)
    if (oldURI) {
      const bucketPath = "/content-base-b78d7.appspot.com/"
      const url = new URL(oldURI).pathname // example result = '/content-base-b78d7.appspot.com/avatars/auddy-1675935309352-IMG_0834.jpeg'
      const oldFilePath = url.replace(bucketPath, "")
      // Delete the old file without waiting.
      await bucket.file(oldFilePath).delete()
    }

    // res.status(200).json({ url: urls[0] })
    return urls[0]
  } catch (error) {
    throw error
  }
}
