import type { Request, Response, NextFunction } from "express"
import axios from "axios"

import { Environment } from "../types"
import { authClient } from "../utils/authClient"

const { KMS_ACCESS_KEY, KMS_BASE_URL, NODE_ENV } = process.env

const env = NODE_ENV as Environment
export async function verifyIdToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authorization = req.headers["authorization"]
    const idToken = authorization?.split(" ")[1]

    // The token for use to authenticate between services in GCP
    const token = env !== "development" ? await authClient.getIdToken() : ""
    // Call the `KMS` service to verify id token
    const result = await axios({
      method: "GET",
      url: `${KMS_BASE_URL}/token/verify`,
      headers: {
        Authorization: token,
        "id-token": idToken || "",
        "x-access-key": KMS_ACCESS_KEY || "",
      },
    })
    const data = result.data as { uid: string }

    if (!data.uid) {
      res.status(401).send("Un Authorized")
    } else {
      req.uid = data.uid
      next()
    }
  } catch (error) {
    next(error)
  }
}
