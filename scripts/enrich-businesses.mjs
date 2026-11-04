import {readFileSync,writeFileSync} from 'node:fs';
import {validateEnrichment,enrichmentSql} from '../lib/acquisition/enrichment.mjs';
const [file,output]=process.argv.slice(2);
if(!file)throw Error('Usage: node scripts/enrich-businesses.mjs reviewed.json [output.sql]');
const rows=JSON.parse(readFileSync(file,'utf8'));
console.log(JSON.stringify(validateEnrichment(rows)));
for(const r of rows)console.log(JSON.stringify({business_id:r.business_id,name:r.business_name,branch:r.branch,before:r.before,after:r.after,services:r.services}));
if(output)writeFileSync(output,enrichmentSql(rows));
console.log('Dry run only. No connection or database write. Review before running the generated transaction through an authorized operator connection.');
