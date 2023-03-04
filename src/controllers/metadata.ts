import path from "path"
import { v4 } from "uuid"
import axios from "axios"

import { bucket } from "../firebase/config"
import type { FollowsMetadataArgs, GetPublishMetadataArgs } from "../types"

const {
  FOLLOWS_METADATA_FILE_NAME,
  NFT_STORAGE_BASE_URL,
  NFT_STORAGE_API_KEY,
  VIDEO_INFO_FILE_NAME,
} = process.env

/**
 * Get follows metadata
 */
export async function uploadFollowsMetadata({
  follower,
  followee,
}: FollowsMetadataArgs) {
  try {
    // Follower Data
    const followerUid = follower.uid
    const followerHandle = follower.handle
    const followerMetadata = {
      followers: follower.followers,
      following: follower.following,
    }
    // Follower: Construct Cloud storage destination
    const followerDestination = path.join(
      followerUid,
      followerHandle.toLowerCase(),
      FOLLOWS_METADATA_FILE_NAME || "follows.json"
    )

    // Follower: Upload the new metadata object
    const followerJsonFile = bucket.file(followerDestination)
    await followerJsonFile.save(JSON.stringify(followerMetadata))

    // Followee Data
    const followeeUid = followee.uid
    const followeeHandle = followee.handle
    const followeeMetadata = {
      followers: followee.followers,
      following: followee.following,
    }
    // Followee: Construct Cloud storage destination
    const followeeDestination = path.join(
      followeeUid,
      followeeHandle.toLowerCase(),
      FOLLOWS_METADATA_FILE_NAME || "follows.json"
    )

    // Followee: Upload the new metadata object
    const followeeJsonFile = bucket.file(followeeDestination)
    await followeeJsonFile.save(JSON.stringify(followeeMetadata))

    return { status: "Ok" }
  } catch (error) {
    throw error
  }
}

/**
 * Get publish metadata
 * @dev This function will return metadata uri and a video content path for use in video upload process
 * @dev We make a video upload in a separate route as it takes long time so users don't have to wait for the video upload process to be finished, they will just be able to close and once the upload process finished the publish will be ready.
 */
export async function getPublishMetadata({
  uid,
  filename,
  handle,
  uploadType = "publish",
}: GetPublishMetadataArgs) {
  try {
    // 1. Construct cloud storage destination parent path that will hold the thumbnails, content, and metadata json object.
    // Make sure to `lowerCase` the handle
    // Use uuid as a folder name for each publish and this folder will contain the thumbnail images and the video itself
    const publishId = v4()
    const destinationParentPath = path.join(
      uid,
      handle.toLowerCase(),
      uploadType,
      publishId
    )

    // 2. Get video content uri
    // Construct the video content destination path
    const videoContentDestination = path.join(destinationParentPath, filename)
    // Get displayed url
    const uploadedVideo = bucket.file(videoContentDestination)
    const urls = await uploadedVideo.getSignedUrl({
      action: "read",
      expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 1000,
    })
    const publishURI = urls[0]

    // 3. Get video info uri
    // Construct the video info destination path
    const videoInfoDestination = path.join(
      destinationParentPath,
      VIDEO_INFO_FILE_NAME || "info.json"
    )
    const videoInfoJsonFile = bucket.file(videoInfoDestination)
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
    await videoInfoJsonFile.save(JSON.stringify(videoInfo))
    const videoInfoUrls = await videoInfoJsonFile.getSignedUrl({
      action: "read",
      expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 1000,
    })
    const videoInfoURI = videoInfoUrls[0]

    // 4. Upload the video metadata to nft.storage
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

    return {
      metadataURI,
      publishURI,
      contentPath: videoContentDestination,
      //   contentParentPath: destinationParentPath,
    }
  } catch (error) {
    throw error
  }
}
