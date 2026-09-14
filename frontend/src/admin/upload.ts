import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { adminApi } from "@/src/admin/adminApi";

export type PermissionState = "granted" | "undetermined" | "denied" | "blocked";

/** Photo-library permission status without prompting. Web never needs it. */
export async function photoPermissionStatus(): Promise<PermissionState> {
  if (Platform.OS === "web") return "granted";
  const p = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (p.granted) return "granted";
  if (p.status === "undetermined") return "undetermined";
  return p.canAskAgain ? "denied" : "blocked";
}

/** Requests photo-library permission (call only after the user showed intent). */
export async function requestPhotoPermission(): Promise<PermissionState> {
  if (Platform.OS === "web") return "granted";
  const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (p.granted) return "granted";
  return p.canAskAgain ? "denied" : "blocked";
}

async function buildForm(uri: string, name: string, type: string): Promise<FormData> {
  const form = new FormData();
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    form.append("file", blob, name);
  } else {
    form.append("file", { uri, name, type } as any);
  }
  return form;
}

/** Opens the image picker and uploads the chosen image. Returns the served URL or null if cancelled. */
export async function pickAndUploadImage(): Promise<{ url: string } | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
    allowsEditing: Platform.OS !== "web",
    aspect: [1, 1],
  });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  const type = a.mimeType || "image/jpeg";
  const ext = type.split("/")[1] || "jpg";
  const name = a.fileName || `photo.${ext}`;
  if (a.fileSize && a.fileSize > 10 * 1024 * 1024) throw new Error("Image is larger than 10 MB");
  const up = await adminApi.upload(await buildForm(a.uri, name, type));
  return { url: up.url };
}

/** Opens the document picker for a PDF and uploads it. */
export async function pickAndUploadPdf(): Promise<{ url: string; name: string } | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  if (a.size && a.size > 10 * 1024 * 1024) throw new Error("PDF is larger than 10 MB");
  const up = await adminApi.upload(await buildForm(a.uri, a.name || "notes.pdf", a.mimeType || "application/pdf"));
  return { url: up.url, name: a.name || "notes.pdf" };
}
