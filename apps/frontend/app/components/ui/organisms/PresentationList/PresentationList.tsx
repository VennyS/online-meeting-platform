export interface IFile {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
}

interface PresentationListProps {
  files: IFile[];
  onClick: (url: string) => void;
}

const PresentationList = ({ files, onClick }: PresentationListProps) => {
  // Функция для форматирования размера файла
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="presentation-list">
      {files.length === 0 ? (
        <p>Нет файлов для отображения</p>
      ) : (
        <div className="files-container">
          {files.map((file) => (
            <div key={file.id} className="file-item">
              <div className="file-info">
                <h3 className="file-name">{file.fileName}</h3>
                <p className="file-size">
                  Размер: {formatFileSize(file.fileSize)}
                </p>
              </div>
              <button
                className="download-btn"
                onClick={() => onClick(file.url)}
                aria-label={`Транслировать ${file.fileName}`}
              >
                Транслировать
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PresentationList;
