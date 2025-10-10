import { useEffect, useState } from "react";
import { IFile } from "../PresentationList/PresentationList";
import { fileService } from "@/app/services/file.service";
import Modal from "../../atoms/Modal/Modal";
import { formatFileSize } from "@/app/lib/formatFileSize";
import { RoomFilesModalProps } from "./types";

export const RoomFilesModal = ({
  shortId,
  isOpen,
  onClose,
}: RoomFilesModalProps) => {
  const [files, setFiles] = useState<IFile[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchFiles = async () => {
      setLoading(true);
      try {
        const data = await fileService.list(shortId, 0, 50);
        setFiles(data);
      } catch (err) {
        setError("Не удалось загрузить файлы встречи");
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [shortId, isOpen]);

  const handleDelete = async (fileId: number) => {
    try {
      await fileService.delete(fileId);
      setFiles((prev) => (prev ? prev.filter((f) => f.id !== fileId) : prev));
    } catch (err) {
      console.log(err);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose}>
      <button onClick={onClose}>Закрыть</button>
      {loading && <p>Загрузка...</p>}
      {error && <p>{error}</p>}
      {files && files.length === 0 && <p>Файлы отсутствуют</p>}
      {files &&
        files.map((file: IFile) => (
          <div key={file.id} style={{ marginBottom: 12 }}>
            <input
              type="text"
              value={file.fileName}
              onChange={(e) => {
                const newName = e.target.value;
                setFiles((prev) =>
                  prev
                    ? prev.map((f) =>
                        f.id === file.id ? { ...f, fileName: newName } : f
                      )
                    : prev
                );
              }}
            />
            <p>Тип: {file.fileType}</p>
            <p>Размер: {formatFileSize(file.fileSize)}</p>
            <button onClick={() => handleDelete(file.id)}>Удалить</button>
            <button
              onClick={async () => {
                try {
                  const updated = await fileService.patch(
                    file.id,
                    file.fileName
                  );
                  setFiles((prev) =>
                    prev
                      ? prev.map((f) => (f.id === file.id ? updated : f))
                      : prev
                  );
                } catch (err) {
                  alert("Не удалось обновить имя файла");
                }
              }}
            >
              Обновить
            </button>
            <button
              onClick={async () => {
                try {
                  const res = await fetch(file.url);
                  if (!res.ok) throw new Error("Ошибка скачивания");
                  const blob = await res.blob();
                  const downloadUrl = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = downloadUrl;
                  a.download = file.fileName;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(downloadUrl);
                } catch (err) {
                  console.error(err);
                  alert("Не удалось скачать файл");
                }
              }}
            >
              Скачать
            </button>
          </div>
        ))}
    </Modal>
  );
};
