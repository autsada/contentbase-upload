import { promisify } from "util"
import fs from "fs"
import sharp from "sharp"
import { v4 } from "uuid"

import { bucket } from "../firebase/config"
import { osTempDir } from "../middlewares/multer"

export async function avatarUpload({
  file,
  handle,
  storageFolder,
}: {
  file: Express.Multer.File
  handle: string
  storageFolder: string
}) {
  try {
    const filename = file.filename.split("-")[0]
    console.log("filename: ", file.filename)
    const inputFilePath = file.path
    const outputFilePath = `${osTempDir}/${filename}-${Date.now()}`

    await sharp(inputFilePath)
      .resize({ width: 640, height: 640, fit: "contain" })
      .withMetadata()
      .toFile(outputFilePath)

    // Construct destination string for the image to be saved on cloud storage
    // Make sure to `lowerCase` the handle
    const uniqueId = v4().replace(/-/g, "")
    const destination = `${storageFolder}/${handle.toLowerCase()}-${uniqueId}-${filename}`

    console.log("destination: ", destination)
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

    // res.status(200).json({ url: urls[0] })
    return urls[0]
  } catch (error) {
    throw error
  }
}
