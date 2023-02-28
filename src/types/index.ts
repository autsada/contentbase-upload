export type Environment = "production" | "development" | "staging"
export type UploadType = "avatar" | "publish"
export type UploadArgs = {
  uid: string
  file?: Express.Multer.File
  handle: string
  uploadType: UploadType
  oldURI?: string
}
export type FollowsMetadataArgs = {
  follower: {
    handle: string
    uid: string
    followers: { tokenId: string; handle: string }[]
    following: { tokenId: string; handle: string }[]
  }
  followee: {
    handle: string
    uid: string
    followers: { tokenId: string; handle: string }[]
    following: { tokenId: string; handle: string }[]
  }
}
