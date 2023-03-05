export type Environment = "production" | "development" | "staging"
export type UploadType = "avatar" | "publish"
export type UploadFileArgs = {
  uid: string
  file?: Express.Multer.File
  handle: string
  uploadType: UploadType
}
export type UploadAvatarArgs = UploadFileArgs & {
  oldURI?: string
}
export type UploadPublishArgs = UploadFileArgs & {
  publishId: string
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
