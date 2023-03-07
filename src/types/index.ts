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

export type PublishMetadataArgs = {
  uid: string
  handle: string
  publishId: string // Use string instead of number as we will use it as string
  info: {
    details?: {
      title?: String
      description?: String
      primaryCategory?: String
      secondaryCategory?: String
      tertiaryCategory?: String
    }
    likes?: (string | undefined)[] // Array of profile token id
    dislikes?: number // dislikes count
    comments?: ({ profileId: string; text: string } | undefined)[] // Array of comments
    tips?: ({ profileId: string; amount: string } | undefined)[] // Array of tips
  }
}
