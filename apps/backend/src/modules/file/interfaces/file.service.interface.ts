export interface IFileService {
  upload(file: Express.Multer.File, key: string): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getPresignedUrl(key: string): Promise<string>;
}
