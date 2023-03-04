// import { firestore } from "firebase-admin"

// import { db } from "../firebase/config"

// type Args<T = Record<string, any>> = {
//   collectionName: string
//   docId: string
//   data: T
//   fieldName: string
//   fieldValue: any
// }

// /**
//  * Convert Firestore snapshot to Javascript object.
//  * @param snapshot Firestore snapshot
//  * @returns doc object
//  */
// export function snapshotToDoc<T extends Record<string, any>>(
//   snapshot: firestore.DocumentSnapshot<firestore.DocumentData>
// ) {
//   const data = snapshot.data() as T & {
//     createdAt: firestore.Timestamp
//     updatedAt?: firestore.Timestamp
//   }

//   const createdAt = data?.createdAt ? data.createdAt.toDate().toString() : null
//   const updatedAt = data?.updatedAt ? data.updatedAt.toDate().toString() : null

//   const doc: T = {
//     ...data,
//     id: snapshot.id,
//     createdAt,
//     updatedAt,
//   }

//   return doc
// }

// /**
//  * Get document by id.
//  * @param input.collectionName
//  * @param input.docId
//  * @returns doc
//  */
// export async function getDocById<T extends Record<string, any>>({
//   collectionName,
//   docId,
// }: Pick<Args, "collectionName" | "docId">) {
//   const snapshot = await db.collection(collectionName).doc(docId).get()

//   if (!snapshot.exists) return null

//   return snapshotToDoc<T>(snapshot)
// }

// /**
//  * Create a new doc with pre-defined id.
//  * @param input.collectionName
//  * @param input.docId
//  * @param input.data
//  * @returns
//  */
// export function createDocWithId<T extends Record<string, any>>({
//   collectionName,
//   docId,
//   data,
// }: Pick<Args<T>, "collectionName" | "docId" | "data">) {
//   return db
//     .collection(collectionName)
//     .doc(docId)
//     .set(
//       {
//         ...data,
//         createdAt: new Date(),
//       },
//       { merge: true }
//     )
// }

// /**
//  * Update a doc of the specified id.
//  * @param input.collectionName
//  * @param input.docId
//  * @param input.data
//  * @returns
//  */
// export function updateDocById<T extends Record<string, any>>({
//   collectionName,
//   docId,
//   data,
// }: Pick<Args<T>, "collectionName" | "docId" | "data">) {
//   return db
//     .collection(collectionName)
//     .doc(docId)
//     .set(
//       {
//         ...data,
//         updatedAt: new Date(),
//       },
//       { merge: true }
//     )
// }
