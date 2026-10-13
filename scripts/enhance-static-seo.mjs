import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const dist = join(process.cwd(), 'dist');

/** @param {string} directory @returns {Promise<string[]>} */
async function htmlFiles(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await htmlFiles(path));
    else if (entry.name.endsWith('.html')) found.push(path);
  }
  return found;
}

/** @param {string} text */
function plainText(text) {
  return text
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** @param {string} text */
function escapeAttribute(text) {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

let enhancedLinks = 0;
for (const file of await htmlFiles(dist)) {
  const source = await readFile(file, 'utf8');
  const html = source.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (anchor, attributes, body) => {
    if (/\btitle="[^"]+"/i.test(attributes)) return anchor;
    const ariaLabel = attributes.match(/\baria-label="([^"]+)"/i)?.[1];
    const heading = body.match(/<(?:h[1-6]|strong)\b[^>]*>([\s\S]*?)<\/(?:h[1-6]|strong)>/i)?.[1];
    const label = plainText(ariaLabel || heading || body).slice(0, 120);
    if (!label) return anchor;
    enhancedLinks++;
    return `<a${attributes} title="${escapeAttribute(label)}">${body}</a>`;
  });
  if (html !== source) await writeFile(file, html);
}

console.log(`Enhanced ${enhancedLinks} static links with descriptive title attributes.`);
