import path from "path"

import { bucket } from "../firebase/config"
import type { FollowsMetadataArgs } from "../types"

const { FOLLOWS_METADATA_FILE_NAME } = process.env

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
