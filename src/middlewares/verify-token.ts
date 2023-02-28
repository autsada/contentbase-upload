import type { Request, Response, NextFunction } from "express"
import axios from "axios"

const { KMS_ACCESS_KEY, KMS_BASE_URL } = process.env

export async function verifyIdToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authorization = req.headers["authorization"]
    const idToken = authorization?.split(" ")[1]

    // Call the `KMS` service to verify id token
    const result = await axios({
      method: "GET",
      url: `${KMS_BASE_URL}/token/verify`,
      headers: {
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
