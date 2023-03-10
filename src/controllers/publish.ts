import path from "path"
import axios from "axios"
import { promisify } from "util"
import fs from "fs"

import { bucket } from "../firebase/config"
import { authClient } from "../utils/authClient"
import type { UploadPublishArgs, Environment } from "../types"

const {
  NFT_STORAGE_BASE_URL,
  NFT_STORAGE_API_KEY,
  VIDEO_INFO_FILE_NAME,
  PUBLIC_APIS_BASE_URL,
  NODE_ENV,
  API_ACCESS_TOKEN,
} = process.env

const env = NODE_ENV as Environment

export async function uploadVideo({
  uid,
  file,
  handle,
  publishId,
  uploadType = "publish",
}: UploadPublishArgs) {
  try {
    if (!file) {
      throw { status: 400, message: "Bad request" }
    }
    // Only process video file
    if (
      !file.mimetype.startsWith("video/") &&
      !file.mimetype.startsWith("application/octet-stream")
    ) {
      throw { status: 400, message: "Wrong file type" }
    }

    // Update loading status of the publish in the database so the frontends can update its UIs.
    // The token for use to authenticate between services in GCP
    const token =
      env !== "development"
        ? await authClient.getIdToken(PUBLIC_APIS_BASE_URL!)
        : ""

    // Call (without waiting) the `Public API` service to update the publish in database
    axios({
      method: "PATCH",
      url: `${PUBLIC_APIS_BASE_URL}/api/publish/${publishId}`,
      headers: {
        Authorization: token,
        "api-access-token": API_ACCESS_TOKEN || "",
      },
      data: {
        isUploading: true,
      },
    })

    const filename = file.filename // with extension
    const inputFilePath = file.path

    // Construct cloud storage destination parent path that will hold the thumbnails, content, and metadata json object.
    // Make sure to `lowerCase` the handle
    const destinationParentPath = path.join(
      uid,
      handle.toLowerCase(),
      uploadType,
      publishId
    )

    // Upload the video to Cloud storage
    // Construct the video content destination path
    const videoContentDestination = path.join(destinationParentPath, filename)
    await bucket.upload(inputFilePath, {
      destination: videoContentDestination,
      resumable: true,
    })

    // Get displayed url
    const uploadedVideo = bucket.file(videoContentDestination)
    const urls = await uploadedVideo.getSignedUrl({
      action: "read",
      expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 1000,
    })
    const publishURI = urls[0]

    // Upload video info json object template to Cloud storage
    const videoInfo = {
      details: {
        creator: handle.toLowerCase(),
        title: "",
        description: "",
        primaryCategory: "",
        secondaryCategory: "",
        kind: "Video",
      },
      likes: [], // Array of profile token id
      dislikes: 0, // Number of dislikes
      comments: [],
      tips: [],
    }
    // Construct the video info destination path
    const videoInfoDestination = path.join(
      destinationParentPath,
      VIDEO_INFO_FILE_NAME || "info.json"
    )
    const videoInfoJsonFile = bucket.file(videoInfoDestination)
    await videoInfoJsonFile.save(JSON.stringify(videoInfo))
    const videoInfoUrls = await videoInfoJsonFile.getSignedUrl({
      action: "read",
      expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 1000,
    })
    const videoInfoURI = videoInfoUrls[0]

    // Upload the video metadata to nft.storage
    const metadata = {
      name: `@${handle}'s publish`,
      image: publishURI,
      properties: {
        infoURI: videoInfoURI,
      },
    }
    const uploadMetadataResult = await axios({
      method: "POST",
      url: `${NFT_STORAGE_BASE_URL}/upload`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NFT_STORAGE_API_KEY}`,
      },
      data: metadata,
    })
    const metadataURI = uploadMetadataResult?.data.value?.cid

    // Call (without waiting) the `Public API` service to update the publish in database
    axios({
      method: "PATCH",
      url: `${PUBLIC_APIS_BASE_URL}/api/publish/${publishId}`,
      headers: {
        Authorization: token,
        "api-access-token": API_ACCESS_TOKEN || "",
      },
      data: {
        publishURI,
        metadataURI,
        kind: "Video",
      },
    })

    // Unlink temp files
    const unlink = promisify(fs.unlink)
    await unlink(inputFilePath)

    return { status: "Ok" }
  } catch (error) {
    throw error
  }
}

export async function uploadThumbnail({
  uid,
  file,
  handle,
  uploadType = "publish",
  publishId,
}: UploadPublishArgs) {
  // `thumbSource` is a string to tell if user want to set a generated thumbnail or a custom thumbnail in their publish.
  try {
    if (!file) {
      throw { status: 400, message: "Bad request" }
    }

    // Only process image file
    if (!file.mimetype.startsWith("image/")) {
      throw { status: 400, message: "Wrong file type" }
    }

    // const filename = file.filename
    const inputFilePath = file.path

    const destinationPath = path.join(
      uid,
      handle.toLowerCase(),
      uploadType,
      publishId,
      `thumbnail.png`
    )

    // Upload the image to cloud storage
    await bucket.upload(inputFilePath, {
      destination: destinationPath,
      resumable: true,
    })

    const uploadedFile = bucket.file(destinationPath)
    const urls = await uploadedFile.getSignedUrl({
      action: "read",
      expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 1000,
    })
    const thumbnail = urls[0]

    // Unlink temp files
    const unlink = promisify(fs.unlink)
    await unlink(inputFilePath)

    // If user uses their custom thumbnail, we also need to update the publish in database
    if (thumbnail) {
      // Update the publish in database
      // The token for use to authenticate between services in GCP
      const token =
        env !== "development"
          ? await authClient.getIdToken(PUBLIC_APIS_BASE_URL!)
          : ""
      // Call the `Public API` service to update the publish in database
      await axios({
        method: "PATCH",
        url: `${PUBLIC_APIS_BASE_URL}/api/publish/${publishId}`,
        headers: {
          Authorization: token,
          "api-access-token": API_ACCESS_TOKEN || "",
        },
        data: {
          thumbnail,
        },
      })
    }

    return { thumbnail }
  } catch (error) {
    throw error
  }
}
