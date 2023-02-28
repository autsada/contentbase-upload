import path from "path"
import { v4 } from "uuid"
import axios from "axios"

import { bucket } from "../firebase/config"
import { generateThumbnails } from "../utils"
import type { UploadArgs } from "../types"

const { NFT_STORAGE_BASE_URL, NFT_STORAGE_API_KEY } = process.env

export async function uploadVideo({
  uid,
  file,
  handle,
  uploadType = "publish",
}: UploadArgs) {
  try {
    if (!file) {
      throw { status: 400, message: "Bad request" }
    }
    // Only process video file
    if (!file.mimetype.startsWith("video/")) {
      throw { status: 400, message: "Wrong file type" }
    }

    const filename = file.filename // with extension
    const inputFilePath = file.path

    // Construct cloud storage destination parent path that will hold the thumbnails and the content.
    // Make sure to `lowerCase` the handle
    // Use uuid as a folder name for each publish and this folder will contain the thumbnail images and the video itself
    const publishId = v4()
    const destinationParentPath = path.join(
      uid,
      handle.toLowerCase(),
      uploadType,
      publishId
    )

    // Upload the video to cloud storage
    // Construct destination path
    const destination = path.join(destinationParentPath, filename)
    await bucket.upload(inputFilePath, {
      destination,
      resumable: true,
    })

    // Get displayed url
    const uploadedFile = bucket.file(destination)
    const urls = await uploadedFile.getSignedUrl({
      action: "read",
      expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 1000,
    })
    const publishURI = urls[0]

    // Generate thumbnail
    // Input file will be unlinked once generate thumbnails finished
    const thumbnails = await generateThumbnails(
      filename,
      inputFilePath,
      destinationParentPath
    )

    // Upload the video metadata to nft.storage
    const metadata = {
      name: `@${handle}'s publish`,
      content: publishURI,
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
    const metadataURI = result?.data.value?.cid

    return { thumbnails, publishURI, metadataURI }
  } catch (error) {
    throw error
  }
}
