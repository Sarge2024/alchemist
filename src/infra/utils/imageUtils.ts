import fs from 'fs';
import path from 'path';
import { put } from '@vercel/blob';

const uploadDir = path.join(process.cwd(), "public", "uploads");

export async function uploadToStorage(localPath: string, destinationName: string): Promise<string | null> {
  try {
    let fullLocalPath = localPath;
    
    if (localPath.startsWith('/uploads/')) {
      fullLocalPath = path.join(process.cwd(), 'public', localPath);
    } else if (!path.isAbsolute(localPath)) {
      fullLocalPath = path.join(process.cwd(), 'public', localPath);
    }
    
    if (!fs.existsSync(fullLocalPath)) {
      console.error(`[Storage] Arquivo não encontrado para upload: ${fullLocalPath}`);
      return null;
    }

    const buffer = fs.readFileSync(fullLocalPath);
    
    const blob = await put(`recipes/${destinationName}`, buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    return blob.url;
  } catch (error) {
    console.error("[Storage] Erro no upload para o Vercel Blob:", error);
    return null;
  }
}

export async function downloadAndSaveImage(url: string): Promise<string | null> {
  try {
    if (!url || !url.startsWith('http')) return null;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      }
    });

    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.startsWith("image/")) {
      console.warn(`URL does not point to a valid image: ${url}`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    
    let extension = contentType.split("/")[1]?.split("+")[0] || "jpg";
    if (extension === "jpeg") extension = "jpg";
    
    const filename = `downloaded-${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, buffer);
    console.log(`[Image Service] Salva com sucesso: /uploads/${filename}`);
    return `/uploads/${filename}`;
  } catch (error) {
    console.error(`[Image Service] Erro ao baixar imagem de ${url}:`, error);
    return null;
  }
}
