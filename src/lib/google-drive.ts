import { google } from "googleapis";
import { Readable } from "stream";

/**
 * Envia um arquivo para o Google Drive, dentro de uma subpasta nomeada pelo
 * caminho passado (ex.: "contrato/<id-do-contrato>"), criando as pastas que
 * ainda não existirem dentro da pasta raiz configurada em GOOGLE_DRIVE_ROOT_FOLDER_ID.
 *
 * Requer uma conta de serviço do Google Cloud com a Drive API habilitada,
 * e a pasta raiz compartilhada com o e-mail dessa conta de serviço.
 * Configure em variáveis de ambiente (ver README):
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
 *   GOOGLE_DRIVE_ROOT_FOLDER_ID
 */
export async function enviarParaGoogleDrive(file: File, caminhoPastas: string): Promise<string> {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  const drive = google.drive({ version: "v3", auth });

  let parentId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;
  for (const nomePasta of caminhoPastas.split("/")) {
    parentId = await obterOuCriarPasta(drive, nomePasta, parentId);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const res = await drive.files.create({
    requestBody: { name: file.name, parents: [parentId] },
    media: { mimeType: file.type || "application/octet-stream", body: Readable.from(buffer) },
    fields: "id, webViewLink",
  });

  return res.data.webViewLink ?? `https://drive.google.com/file/d/${res.data.id}/view`;
}

async function obterOuCriarPasta(
  drive: ReturnType<typeof google.drive>,
  nome: string,
  parentId: string
): Promise<string> {
  const busca = await drive.files.list({
    q: `name = '${nome.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
  });

  if (busca.data.files && busca.data.files.length > 0) {
    return busca.data.files[0].id!;
  }

  const nova = await drive.files.create({
    requestBody: { name: nome, mimeType: "application/vnd.google-apps.folder", parents: [parentId] },
    fields: "id",
  });

  return nova.data.id!;
}
