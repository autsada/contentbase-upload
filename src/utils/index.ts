import path from "path"
import fs from "fs"
import { promisify } from "util"
import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg"
import ffmpeg from "fluent-ffmpeg"
ffmpeg.setFfmpegPath(ffmpegPath)
import getVideoDurationInSeconds from "get-video-duration"
import sharp from "sharp"
import mkdirp from "mkdirp"

import { bucket } from "../firebase/config"
import { osTempDir } from "../middlewares/multer"

const THUMB_PREFIX = "thumb_"

/**
 * @param filename - name of the file (with extension)
 * @param inputFilePath - path to the input file used to generate thumbnails
 * @param destinationPath  - parent path in cloud storage that the generated thumbnails will be saved to
 * @returns
 */
export async function generateThumbnails(
  filename: string,
  inputFilePath: string,
  destinationPath: string
) {
  // Construct output dir path, use cloud storage destination path as the folder
  const tempOutputDir = path.join(osTempDir, destinationPath)

  // Use these formate for temp output path
  const filenameWithOutExt = path.parse(filename).name
  const tempOutputPath = path.join(
    tempOutputDir,
    `${THUMB_PREFIX}%03d_${filenameWithOutExt}.png`
  )

  // Create the actual temp output dir
  await mkdirp(tempOutputDir)

  // Get video duration
  const duration = await getVideoDurationInSeconds(inputFilePath)

  // Generate thumbnails to temp output path
  // Generate 1 thumbnail if duration is less than 30 seconds otherwise generate 3
  if (duration <= 30) {
    await generateOneFrame(inputFilePath, duration, tempOutputPath)
  } else {
    await generateFrames(inputFilePath, duration, tempOutputPath)
  }

  // Get all the generated output file names from the temp output dir
  const generatedOutputNames = await fs.promises.readdir(tempOutputDir)

  // We will need to have these generated output paths for use to unlink the generated files later once finished
  const generatedOutputPaths: string[] = []

  // We will also need the resized file paths to unlink those resized files later
  const resizedOutputPaths: string[] = []

  // Map through the output file names and process resizing to each file.
  const storageUrls = await Promise.all(
    generatedOutputNames.map(async (file) => {
      // Get the path of the generated output file
      const generatedOutputPath = path.join(tempOutputDir, file)
      generatedOutputPaths.push(generatedOutputPath)

      // Use sharp to resize the generated image
      // Use each generated output path as an input path for sharp
      const resizedOutputPath = path.join(osTempDir, `${file}-${Date.now()}`)
      resizedOutputPaths.push(resizedOutputPath)
      await sharp(generatedOutputPath)
        .resize({ width: 640, fit: "inside" })
        .png({ quality: 80 })
        .withMetadata()
        .toFile(resizedOutputPath)

      // Construct destination path in cloud storage
      const uploadDestination = `${destinationPath}/${file}`

      // Upload each resized image to cloud storage
      await bucket.upload(resizedOutputPath, {
        destination: uploadDestination,
        resumable: true,
      })

      const uploadedFile = bucket.file(uploadDestination)
      const urls = await uploadedFile.getSignedUrl({
        action: "read",
        expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 1000,
      })

      return urls[0]
    })
  )

  const unlink = promisify(fs.unlink)
  await unlink(inputFilePath)
  // Unlink the generated images
  await Promise.all(generatedOutputPaths.map((p) => unlink(p)))
  // Unlink the resized images
  await Promise.all(resizedOutputPaths.map((p) => unlink(p)))

  return storageUrls
}

/**
 * Generate one image
 * @param inputFilePath - path to the input file
 * @param duration - number in seconds
 * @param outputFilePath - path to store the output
 */
async function generateOneFrame(
  inputFilePath: string,
  duration: number,
  outputFilePath: string
) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(inputFilePath)
      .seekInput(duration / 2)
      .frames(1)
      .saveToFile(outputFilePath)
      .on("end", resolve)
      .on("error", (error) => reject(error))
  })
}

/**
 * Generate 3 images
 * @param inputFilePath - path to the input file
 * @param duration - number in seconds
 * @param outputFilePath - path to store the output
 */
async function generateFrames(
  inputFilePath: string,
  duration: number,
  outputFilePath: string
) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(inputFilePath)
      .fps(1 / Math.floor(duration))
      .saveToFile(outputFilePath)
      .on("end", resolve)
      .on("error", (error) => reject(error))
  })
}
