import React, { useState } from 'react';
import { Upload, message, Image } from 'antd';
import { PlusOutlined, LoadingOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import './ImageUploader.css';

interface ImageUploaderProps {
  onChange?: (file: File | null) => void;
  maxSize?: number; // MB
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onChange,
  maxSize = 10,
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件!');
      return false;
    }

    const isLtSize = file.size / 1024 / 1024 < maxSize;
    if (!isLtSize) {
      message.error(`图片大小不能超过 ${maxSize}MB!`);
      return false;
    }

    // Create preview
    setPreviewUrl(URL.createObjectURL(file));
    onChange?.(file);

    return false; // Prevent auto upload
  };

  const handleChange: UploadProps['onChange'] = (info) => {
    setFileList(info.fileList);

    if (info.file.status === 'uploading') {
      setLoading(true);
    }

    if (info.file.status === 'done') {
      setLoading(false);
    }

    if (info.file.status === 'removed') {
      setPreviewUrl('');
      onChange?.(null);
    }
  };

  const handleRemove = () => {
    setPreviewUrl('');
    setFileList([]);
    onChange?.(null);
  };

  const uploadButton = (
    <div className="upload-button">
      {loading ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>上传图片</div>
      <div className="upload-hint">支持拖拽上传</div>
    </div>
  );

  return (
    <div className="image-uploader">
      {previewUrl ? (
        <div className="preview-container">
          <Image
            src={previewUrl}
            alt="preview"
            className="preview-image"
            preview
          />
          <div className="preview-actions">
            <button
              type="button"
              className="remove-button"
              onClick={handleRemove}
            >
              删除图片
            </button>
          </div>
        </div>
      ) : (
        <Upload
          listType="picture-card"
          fileList={fileList}
          beforeUpload={beforeUpload}
          onChange={handleChange}
          onRemove={handleRemove}
          maxCount={1}
          accept="image/*"
          className="upload-area"
        >
          {fileList.length === 0 && uploadButton}
        </Upload>
      )}
    </div>
  );
};

export default ImageUploader;
