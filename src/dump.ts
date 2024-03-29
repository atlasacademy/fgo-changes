import { WebhookClient } from 'discord.js';
import { appendFileSync } from 'fs';
import p from 'papaparse';
import yargs from 'yargs';
import git from 'isomorphic-git';
import * as fs from 'fs';

export async function dump(dump : { [k : string]: any[] }, dir : string, region : string) {
    let { svt, ce, skill, buff, np, func } = dump;
    let files : { attachment: Buffer, name: string }[] = [];

    if (svt.length)
    {
        console.log(`Dumping servant changes...`);
        files.push({ name: `svt.txt`, attachment: Buffer.from(p.unparse(svt, { delimiter: '\t' }), 'utf-8') })
    }

    if (ce.length)
    {
        console.log(`Dumping CE changes...`);
        files.push({ name: `ce.txt`, attachment: Buffer.from(p.unparse(ce, { delimiter: '\t' }), 'utf-8') })
    }

    if (skill.length)
    {
        console.log(`Dumping skill changes...`);
        files.push({ name: `skill.txt`, attachment: Buffer.from(p.unparse(skill, { delimiter: '\t' }), 'utf-8') })
    }

    if (np.length)
    {
        console.log(`Dumping Noble Phantasm changes...`);
        files.push({ name: `np.txt`, attachment: Buffer.from(p.unparse(np, { delimiter: '\t' }), 'utf-8') })
    }

    if (func.length)
    {
        console.log(`Dumping function changes...`);
        files.push({ name: `func.txt`, attachment: Buffer.from(p.unparse(func, { delimiter: '\t' }), 'utf-8') })
    }

    if (buff.length)
    {
        console.log(`Dumping buff changes...`);
        files.push({ name: `buff.txt`, attachment: Buffer.from(p.unparse(buff, { delimiter: '\t' }), 'utf-8') })
    }

    // process.stdout.write(`Dumping all changes... `);
    // if (files.length) {
    //     files.push({ name: `dump.json`, attachment: Buffer.from(JSON.stringify(dump, null, 2), 'utf-8') });
    //     console.log(`Done.`);
    //     process.stdout.write(`Publishing dumps... `);

    //     let [token, id] = process.env.WEBHOOK.split('/').reverse()
    //     let client = new WebhookClient(id, token);
    //     await client.send('', {
    //         username: `FGO Changelog | ${region}`,
    //         avatarURL: 'https://apps.atlasacademy.io/db/logo192.png',
    //         files,
    //     });
    //     console.log('Done.');
    //     client.destroy();
    // }
    // else console.log(`No changes to be found.`)

    const { path } = yargs.option('path', { type: 'string' }).argv;
    if (path) {
        process.stdout.write(`Appending all changes to ${path}...`);

        let commit = await git.resolveRef({ fs, dir, ref: 'HEAD' });
        let { commit: { committer: { timestamp } } } = await git.readCommit({ fs, dir, oid: commit });

        appendFileSync(path, Buffer.from(JSON.stringify({
            commit, timestamp, changes: dump
        }), 'utf-8') + '\n');
    }
}
