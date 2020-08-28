import * as fs from 'fs';
import { join } from 'path';
import p from 'papaparse';
export async function dump(dump : { [k : string]: any[] }, dir : string) {
    let { svt, ce, skill, buff, np, func } = dump;

    if (svt.length)
    {
        console.log(`Dumping servant changes...`);
        fs.writeFileSync(join(dir, 'svt.tsv'), p.unparse(svt, { delimiter: '\t' }), 'utf8');
    }

    if (ce.length)
    {
        console.log(`Dumping CE changes...`);
        fs.writeFileSync(join(dir, 'ce.tsv'), p.unparse(ce, { delimiter: '\t' }), 'utf8');
    }

    if (skill.length)
    {
        console.log(`Dumping skill changes...`);
        fs.writeFileSync(join(dir, 'skill.tsv'), p.unparse(skill, { delimiter: '\t' }), 'utf8');
    }

    if (np.length)
    {
        console.log(`Dumping Noble Phantasm changes...`);
        fs.writeFileSync(join(dir, 'np.tsv'), p.unparse(np, { delimiter: '\t' }), 'utf8');
    }

    if (func.length)
    {
        console.log(`Dumping function changes...`);
        fs.writeFileSync(join(dir, 'func.json'), JSON.stringify(func), 'utf8');
    }

    if (buff.length)
    {
        console.log(`Dumping buff changes...`);
        fs.writeFileSync(join(dir, 'buff.tsv'), p.unparse(buff, { delimiter: '\t' }), 'utf8');
    }

    process.stdout.write(`Dumping all changes to ${join(dir, `dump.json`)}... `);
    fs.writeFileSync(join(dir, `dump.json`), JSON.stringify(dump), 'utf8');
    console.log(`Done.`);
}