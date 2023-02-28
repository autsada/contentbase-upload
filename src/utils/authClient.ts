import { GoogleAuth } from "google-auth-library"

const { KMS_BASE_URL } = process.env

class AuthClient {
  private auth: GoogleAuth

  constructor() {
    this.auth = new GoogleAuth()
  }

  async getIdToken() {
    const client = await this.auth.getIdTokenClient(KMS_BASE_URL!)
    const headers = await client.getRequestHeaders()

    return headers ? headers["Authorization"] : ""
  }
}

export const authClient = new AuthClient()
