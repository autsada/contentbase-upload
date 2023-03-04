import path from "path"
import { v4 } from "uuid"
import axios from "axios"

import { bucket } from "../firebase/config"
import { generateThumbnails } from "../utils"
import type { UploadPublishArgs } from "../types"

/**
 * This function to for uploading a video and generate thumbnails
 */
export async function uploadVideo({ file, contentPath }: UploadPublishArgs) {
  try {
    if (!file) {
      throw { status: 400, message: "Bad request" }
    }
    // Only process video file
    if (!file.mimetype.startsWith("video/")) {
      throw { status: 400, message: "Wrong file type" }
    }

    // const filename = file.filename // with extension
    const inputFilePath = file.path

    await bucket.upload(inputFilePath, {
      destination: contentPath,
      resumable: true,
    })

    // // Generate video thumbnails
    // // Input file will be unlinked in the `generateThumbnails` function once generate thumbnails finished
    // const thumbnails = await generateThumbnails(
    //   filename,
    //   inputFilePath,
    //   contentParentPath
    // )

    return { status: "Ok" }
  } catch (error) {
    throw error
  }
}

// export async function uploadVideo({
//   uid,
//   file,
//   handle,
//   uploadType = "publish",
// }: UploadFileArgs) {
//   try {
//     if (!file) {
//       throw { status: 400, message: "Bad request" }
//     }
//     // Only process video file
//     if (!file.mimetype.startsWith("video/")) {
//       throw { status: 400, message: "Wrong file type" }
//     }

//     const filename = file.filename // with extension
//     const inputFilePath = file.path

//     // Construct cloud storage destination parent path that will hold the thumbnails, content, and metadata json object.
//     // Make sure to `lowerCase` the handle
//     // Use uuid as a folder name for each publish and this folder will contain the thumbnail images and the video itself
//     const publishId = v4()
//     const destinationParentPath = path.join(
//       uid,
//       handle.toLowerCase(),
//       uploadType,
//       publishId
//     )

//     // Upload the video to Cloud storage
//     // Construct the video content destination path
//     const videoContentDestination = path.join(destinationParentPath, filename)
//     await bucket.upload(inputFilePath, {
//       destination: videoContentDestination,
//       resumable: true,
//     })

//     // Get displayed url
//     const uploadedVideo = bucket.file(videoContentDestination)
//     const urls = await uploadedVideo.getSignedUrl({
//       action: "read",
//       expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 1000,
//     })
//     const publishURI = urls[0]

//     // Generate video thumbnails
//     // Input file will be unlinked in the `generateThumbnails` function once generate thumbnails finished
//     const thumbnails = await generateThumbnails(
//       filename,
//       inputFilePath,
//       destinationParentPath
//     )

//     // Upload video info json object template to Cloud storage
//     const videoInfo = {
//       details: {
//         title: "",
//         description: "",
//         creatorId: "",
//         primaryCategory: "",
//         secondaryCategory: "",
//         tertiaryCategory: "",
//         kind: "",
//       },
//       likes: [],
//       dislikes: [],
//       comments: [],
//       tips: [],
//     }
//     // Construct the video info destination path
//     const videoInfoDestination = path.join(
//       destinationParentPath,
//       VIDEO_INFO_FILE_NAME || "info.json"
//     )
//     const videoInfoJsonFile = bucket.file(videoInfoDestination)
//     await videoInfoJsonFile.save(JSON.stringify(videoInfo))
//     const videoInfoUrls = await videoInfoJsonFile.getSignedUrl({
//       action: "read",
//       expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 1000,
//     })
//     const videoInfoURI = videoInfoUrls[0]

//     // Upload the video metadata to nft.storage
//     const metadata = {
//       name: `@${handle}'s publish`,
//       image: publishURI,
//       properties: {
//         infoURI: videoInfoURI,
//       },
//     }
//     const uploadMetadataResult = await axios({
//       method: "POST",
//       url: `${NFT_STORAGE_BASE_URL}/upload`,
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${NFT_STORAGE_API_KEY}`,
//       },
//       data: metadata,
//     })
//     const metadataURI = uploadMetadataResult?.data.value?.cid

//     return {
//       thumbnails,
//       publishURI,
//       contentPath: videoContentDestination,
//       metadataURI,
//     }
//   } catch (error) {
//     throw error
//   }
// }
