import { WebhookClient, MessageAttachment, Client } from 'discord.js';
import * as fs from 'fs';
import { join } from 'path';
import p from 'papaparse';
export async function dump(dump : { [k : string]: any[] }, dir : string, region : string) {
    let { svt, ce, skill, buff, np, func } = dump;

    let sPath = join(dir, 'svt.tsv'),
        cePath = join(dir, 'ce.tsv'),
        skPath = join(dir, 'skill.tsv'),
        npPath = join(dir, 'np.tsv'),
        funcPath = join(dir, 'func.json'),
        buffPath = join(dir, 'buff.tsv')

    let [token, id] = process.env.WEBHOOK.split('/').reverse()
    let client = new WebhookClient(id, token);

    if (svt.length)
    {
        console.log(`Dumping servant changes...`);
        fs.writeFileSync(sPath, p.unparse(svt, { delimiter: '\t' }), 'utf8');
    }

    if (ce.length)
    {
        console.log(`Dumping CE changes...`);
        fs.writeFileSync(cePath, p.unparse(ce, { delimiter: '\t' }), 'utf8');
    }

    if (skill.length)
    {
        console.log(`Dumping skill changes...`);
        fs.writeFileSync(skPath, p.unparse(skill, { delimiter: '\t' }), 'utf8');
    }

    if (np.length)
    {
        console.log(`Dumping Noble Phantasm changes...`);
        fs.writeFileSync(npPath, p.unparse(np, { delimiter: '\t' }), 'utf8');
    }

    if (func.length)
    {
        console.log(`Dumping function changes...`);
        fs.writeFileSync(funcPath, JSON.stringify(func), 'utf8');
    }

    if (buff.length)
    {
        console.log(`Dumping buff changes...`);
        fs.writeFileSync(buffPath, p.unparse(buff, { delimiter: '\t' }), 'utf8');
    }

    process.stdout.write(`Dumping all changes to ${join(dir, `dump.json`)}... `);
    fs.writeFileSync(join(dir, `dump.json`), JSON.stringify(dump), 'utf8');
    
    console.log(`Done.`);
    process.stdout.write(`Publishing dumps... `);
    await client.send('', {
        username: `FGO Changelog | ${region}`,
        avatarURL: 'https://apps.atlasacademy.io/db/logo192.png',
        files: [sPath, cePath, skPath, npPath, funcPath, buffPath, join(dir, `dump.json`)],
    });
    console.log('Done.');
    client.destroy();
}