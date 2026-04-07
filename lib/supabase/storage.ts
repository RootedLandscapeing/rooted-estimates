"use client";

import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

const UPLOAD_BUCKET = "rooted-uploads";

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function uploadReceiptFile(file: File) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const supabase = getSupabaseBrowserClient();
  const filePath = `receipts/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from(UPLOAD_BUCKET).upload(filePath, file, {
    upsert: false
  });

  if (error) {
    throw error;
  }

  return {
    filePath,
    fileName: file.name
  };
}

export async function createSignedReceiptUrl(filePath: string) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.storage
    .from(UPLOAD_BUCKET)
    .createSignedUrl(filePath, 60 * 10);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}
