/**
 * 构建图片 URL
 *
 * 根据图片路径返回正确的 URL：
 * - 绝对 URL (http/https/data/blob) 直接返回
 * - 相对路径添加前导斜杠
 * - 空值返回空字符串
 *
 * @param imagePath - 图片路径（可以是相对路径或绝对 URL）
 * @returns 可用于 img src 的 URL
 */
export function getImageUrl(imagePath: string | null | undefined): string {
  // 处理空值
  if (!imagePath) {
    return '';
  }

  // 已经是完整 URL（http, https, data, blob）直接返回
  if (
    imagePath.startsWith('http://') ||
    imagePath.startsWith('https://') ||
    imagePath.startsWith('data:') ||
    imagePath.startsWith('blob:')
  ) {
    return imagePath;
  }

  // 确保路径以 / 开头
  if (imagePath.startsWith('/')) {
    return imagePath;
  }

  return `/${imagePath}`;
}
