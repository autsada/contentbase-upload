import path from "path"
import axios from "axios"

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
    if (!file.mimetype.startsWith("video/")) {
      throw { status: 400, message: "Wrong file type" }
    }

    // Update loading status of the publish in the database so the frontends can update its UIs.
    // The token for use to authenticate between services in GCP
    const token =
      env !== "development"
        ? await authClient.getIdToken(PUBLIC_APIS_BASE_URL!)
        : ""

    await axios({
      method: "PATCH",
      url: `${PUBLIC_APIS_BASE_URL}/api/publish/draft/${publishId}`,
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
        title: "",
        description: "",
        creatorId: "",
        primaryCategory: "",
        secondaryCategory: "",
        tertiaryCategory: "",
        kind: "",
      },
      likes: [],
      dislikes: [],
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

    // Call the `Public API` service to update the publish in database
    await axios({
      method: "PATCH",
      url: `${PUBLIC_APIS_BASE_URL}/api/publish/draft/${publishId}`,
      headers: {
        Authorization: token,
        "api-access-token": API_ACCESS_TOKEN || "",
      },
      data: {
        publishURI,
        metadataURI,
      },
    })

    return { status: "Ok" }
  } catch (error) {
    throw error
  }
}
