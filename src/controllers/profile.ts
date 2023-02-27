import { promisify } from "util"
import fs from "fs"
import path from "path"
import sharp from "sharp"
import axios from "axios"

import { bucket } from "../firebase/config"
import { osTempDir } from "../middlewares/multer"
import type { UploadType } from "../types"

const { FIREBASE_STORAGE_BUCKET, NFT_STORAGE_BASE_URL, NFT_STORAGE_API_KEY } =
  process.env
const DEFAULT_AVATAR_FILE_PATH = "contentbase/avatar.png"

export type UploadArgs = {
  uid: string
  file?: Express.Multer.File
  handle: string
  uploadType: UploadType
  oldURI?: string
}

export async function avatarUpload({
  uid,
  file,
  handle,
  uploadType = "avatar",
  oldURI,
}: UploadArgs) {
  try {
    let filename = ""
    // The path in the temp dir to download the raw image to be processed
    let inputFilePath = ""
    // The path in the temp dir of the final image that will be updated to cloud storage
    let outputFilePath = ""

    if (!file) {
      // If user doesn't provide an image, we will use the default image
      // A. Download the default image from cloud storage to os temp path
      filename = "avatar.png"

      // Construct temp file path to save the default image
      const filePath = `${Date.now()}-${filename}`
      const tempFilePath = path.join(osTempDir, filePath)
      // // Get the temp dir name from the file path
      // const tempFileDir = path.dirname(tempFilePath)
      // // Create the temp dir where the default image will be downloaded to.
      // await mkdirp(tempFileDir)
      // Download the default image to the temp file path
      const defaultImage = bucket.file(DEFAULT_AVATAR_FILE_PATH)
      await defaultImage.download({ destination: tempFilePath })

      inputFilePath = tempFilePath
      // In this case the input file path and out put file path is the same as we don't need make changes to the image
      outputFilePath = inputFilePath
    } else {
      // Only process image file
      if (!file.mimetype.startsWith("image/")) {
        throw { status: 400, message: "Wrong file type" }
      }

      filename = file.filename
      inputFilePath = file.path

      // Resize the image
      outputFilePath = path.join(osTempDir, `${filename}-${Date.now()}`)
      await sharp(inputFilePath)
        .resize({ width: 640, height: 640, fit: "cover" })
        .withMetadata()
        .toFile(outputFilePath)
    }

    // Construct destination string for the image to be saved on cloud storage
    // Make sure to `lowerCase` the handle
    // If `oldURI` is provided, it means "update", otherwise "create"
    // For "update", we need to update the new image to the old path (so the `metadataURI` in of the NFT token will not need to change)
    let imageURI = ""
    let metadataURI = ""
    if (!oldURI) {
      // Create case
      const extName = path.extname(inputFilePath)
      const destination = path.join(
        uid,
        handle.toLowerCase(),
        uploadType,
        `${handle}-${Date.now()}${extName}`
      )

      // Upload the image to cloud storage
      await bucket.upload(outputFilePath, {
        destination,
        resumable: true,
      })

      const uploadedFile = bucket.file(destination)
      const urls = await uploadedFile.getSignedUrl({
        action: "read",
        expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 1000,
      })
      imageURI = urls[0]

      // Upload metadata to ipfs
      const metadata = {
        name: `@${handle}'s profile`,
        image: imageURI,
      }
      const result = await axios({
        method: "POST",
        url: `${NFT_STORAGE_BASE_URL}/upload`,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${NFT_STORAGE_API_KEY}`,
        },
        data: metadata,
      })
      metadataURI = result?.data.value?.cid
    } else {
      // Update case
      const destination = new URL(oldURI).pathname.replace(
        `/${FIREBASE_STORAGE_BUCKET}/`,
        ""
      )

      // Delete the old file first
      await bucket.file(destination).delete()

      // Upload the new file to the old path
      await bucket.upload(outputFilePath, {
        destination,
        resumable: true,
      })
      const uploadedFile = bucket.file(destination)
      const urls = await uploadedFile.getSignedUrl({
        action: "read",
        expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 1000,
      })
      imageURI = urls[0]
    }

    const unlink = promisify(fs.unlink)
    await unlink(inputFilePath)
    if (inputFilePath !== outputFilePath) {
      await unlink(outputFilePath)
    }

    return { imageURI, metadataURI }
  } catch (error) {
    throw error
  }
}
