const unsafeFilenameCharacters = /[<>:"/\\|?*\u0000-\u001f\u007f]/g;

export function safeDownloadName(filename: string, extension: string): string {
  const source = filename.replace(/\.[^.]*$/, '').normalize('NFKC');
  const base = source
    .replace(unsafeFilenameCharacters, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[ .-]+|[ .-]+$/g, '')
    .slice(0, 80)
    .replace(/[ .-]+$/g, '') || 'image';
  const safeExtension = /^(?:jpe?g|png|webp)$/.test(extension.toLowerCase()) ? extension.toLowerCase() : 'png';
  return `pixeltokb-${base}.${safeExtension}`;
}
