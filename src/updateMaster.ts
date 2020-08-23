import { WebhookClient, MessageEmbed } from 'discord.js';
import * as fs from 'fs';
import { join } from 'path';

export async function mstUpdate(m : Map<string, any[]>, dir : string, region: string) {
    let [token, id] = process.env.WEBHOOK.split('/').reverse()
    let client = new WebhookClient(id, token);

    let payloads : { name: string, payload: string[] }[] = [];
    {
        // prebuild the obj table
        let table : { id: number, type: number, collectionNo: number }[] = 
            JSON.parse(fs.readFileSync(join(dir, `master`, 'mstSvt.json'), 'utf-8'));
        let lookup = new Map<number, [number, number]>();
        table.forEach(a => lookup.set(a.id, [a.type, a.collectionNo]));
        let changed = new Set<number>();
        [
            `master/mstSvtCard.json`,
            `master/mstSvtChange.json`,
            `master/mstSvtCommandCodeUnlock.json`,
            `master/mstSvtComment.json`,
            `master/mstSvtCommentAdd.json`,
            `master/mstSvtCostume.json`,
            `master/mstSvtCostumeRelease.json`,
            `master/mstSvtGroup.json`,
            `master/mstSvtIndividuality.json`,
            `master/mstSvtLimit.json`,
            `master/mstSvtPassiveSkill.json`,
            `master/mstSvtProfile.json`,
            `master/mstSvtSkill.json`,
            `master/mstSvtSkillRelease.json`,
            `master/mstSvtTreasureDevice.json`,
            `master/mstSvtTreasureDeviceRelease.json`,
            `master/mstSvtVoiceRelation.json`,
        ].forEach(file => m.get(file)?.forEach(a => changed.add(+a.svtId)));

        // collection no
        let CEs = [...changed].filter(a => lookup.get(a)[0] === 6).map(a => lookup.get(a)[1]);
        let SVs = [...changed].filter(a => 
            lookup.get(a)[0] === 2 || lookup.get(a)[0] === 1
        ).map(a => lookup.get(a)[1]);
        
        let pCE = CEs.map(a => `[${a}](https://apps.atlasacademy.io/db/#/${region}/craft-essence/${a})`);
        let pSV = SVs.map(a => `[${a}](https://apps.atlasacademy.io/db/#/${region}/servant/${a})`);
        payloads.push({ name: `Craft Essence changes`, payload: pCE });
        payloads.push({ name: `Servant changes`, payload: pSV });
    }

    for (let p of payloads) {
        if (!p.payload.length) continue;
        let { name, payload } = p;
        await client.send('', {
            username: 'FGO Changelog',
            avatarURL: 'https://apps.atlasacademy.io/db/logo192.png',
            embeds: [
                new MessageEmbed()
                .setTitle(name)
                .setDescription(payload.join(', ')),
            ]
        })
        // .catch()
        // .finally(() => client.destroy());
    }
    await client.destroy()
}