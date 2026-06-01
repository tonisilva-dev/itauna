import fs from 'fs';
import pdfParse from 'pdf-parse';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfPath = path.join(__dirname, '../../documentos/rateiosMensais', process.argv[2] || 'itauna 10-01-26.pdf');
const fileBuffer = fs.readFileSync(pdfPath);

pdfParse(fileBuffer).then(data => {
  console.log('=== PDF Text Content ===\n');
  console.log(data.text);
  console.log('\n=== End ===');
  console.log(`\nPages: ${data.numpages}`);
}).catch(e => console.error('Error:', e.message));
