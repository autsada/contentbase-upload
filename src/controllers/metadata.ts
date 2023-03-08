import path from "path"
import fs from "fs"
import { promisify } from "util"

import { bucket } from "../firebase/config"
import { osTempDir } from "../middlewares/multer"
import type { FollowsMetadataArgs, PublishMetadataArgs } from "../types"

const { FOLLOWS_METADATA_FILE_NAME, VIDEO_INFO_FILE_NAME } = process.env

/**
 * Upload follows metadata
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
 * Upload publish metadata
 */
export async function uploadPublishMetadata({
  uid,
  handle,
  publishId,
  info,
}: PublishMetadataArgs) {
  try {
    // Construct Cloud storage path
    const storageFilePath = path.join(
      uid,
      handle.toLowerCase(),
      "publish",
      `${publishId}`,
      VIDEO_INFO_FILE_NAME!
    )

    // Download the file from Cloud storage to local temp dir
    const localFilePath = path.join(
      osTempDir,
      `${publishId}-${VIDEO_INFO_FILE_NAME!}-${Date.now()}`
    )
    const oldFile = bucket.file(storageFilePath)
    await oldFile.download({ destination: localFilePath })

    // Read the old file
    const readFile = promisify(fs.readFile)
    const oldInfoString = await readFile(localFilePath, { encoding: "utf-8" })
    const oldInfo = JSON.parse(oldInfoString)

    // Upload the new info to Cloud storage
    const newInfo = {
      ...oldInfo,
      details: { ...oldInfo.details, ...info.details },
    }
    await oldFile.save(JSON.stringify(newInfo))

    // Unlink temp file
    const unlink = promisify(fs.unlink)
    await unlink(localFilePath)

    return { status: "Ok" }
  } catch (error) {
    throw error
  }
}
