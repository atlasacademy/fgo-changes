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
        let CEs = [...changed].filter(a =>
            lookup.has(a) ? lookup.get(a)[0] === 6 : false
        ).map(a => lookup.get(a)[1]);
        let SVs = [...changed].filter(a => 
            lookup.has(a) ? (lookup.get(a)[0] === 2 || lookup.get(a)[0] === 1) : false
        ).map(a => lookup.get(a)[1]);
        
        let pCE = CEs
            .sort((a, b) => a - b)
            .map(a => `[${a}](https://apps.atlasacademy.io/db/#/${region}/craft-essence/${a})`);
        let pSV = SVs
            .sort((a, b) => a - b)
            .map(a => `[${a}](https://apps.atlasacademy.io/db/#/${region}/servant/${a})`);
        payloads.push({ name: `Craft Essence changes`, payload: pCE });
        payloads.push({ name: `Servant changes`, payload: pSV });
    }

    {
        let changed = new Set<number>();
        [`master/mstSvtSkill.json`,`master/mstSkillLv.json`]
            .forEach(file => m.get(file)?.forEach(a => changed.add(+a.skillId)));
        [`master/mstSkill.json`, `master/mstSkillDetail.json`]
            .forEach(file => m.get(file)?.forEach(a => changed.add(+a.id)));
        let payload = [...changed]
            .sort((a, b) => a - b)
            .map(a => `[${a}](https://apps.atlasacademy.io/db/#/${region}/skill/${a})`);
        payloads.push({ name: `Skill changes`, payload });
    }

    {
        let changed = new Set<number>();
        [`master/mstTreasureDevice.json`, `master/mstTreasureDeviceDetail.json`]
            .forEach(file => m.get(file)?.forEach(a => changed.add(+a.id)));
        [`master/mstTreasureDeviceLv.json`]
            .forEach(file => m.get(file)?.forEach(a => changed.add(+a.treaureDeviceId)));
        let payload = [...changed]
            .sort((a, b) => a - b)
            .map(id => `[${id}](https://apps.atlasacademy.io/db/#/${region}/noble-phantasm/${id})`)
        payloads.push({ name: `Noble Phantasm changes`, payload });
    }

    {
        let changed = new Set<number>();
        m.get(`master/mstBuff.json`)?.forEach(a => changed.add(+a.id));
        let payload = [...changed]
            .sort((a, b) => a - b)
            .map(id => `[${id}](https://apps.atlasacademy.io/db/#/${region}/buff/${id})`)
        payloads.push({ name: `Buff changes`, payload });
    }

    {
        let changed = new Set<number>();
        m.get(`master/mstFunc.json`)?.forEach(a => changed.add(+a.id));
        m.get(`master/mstFuncGroup.json`)?.forEach(a => changed.add(+a.funcId));
        let payload = [...changed]
            .sort((a, b) => a - b)
            .map(id => `[${id}](https://apps.atlasacademy.io/db/#/${region}/func/${id})`)
        payloads.push({ name: `Function changes`, payload });
    }

    for (let p of payloads) {
        let { name, payload } = p,
            payloadChunk: string[] = [],
            payloadSize = 0;

        const payloadLimit = 2048;
        const sendPayload = async () => {
            await client.send('', {
                username: `FGO Changelog | ${region}`,
                avatarURL: 'https://apps.atlasacademy.io/db/logo192.png',
                embeds: [
                    new MessageEmbed()
                        .setTitle(name)
                        .setDescription(payloadChunk.join(', ')),
                ]
            });

            payloadChunk = [];
            payloadSize = 0;

            await new Promise(resolve => setTimeout(resolve, 1000));
        };

        for (let line of payload) {
            if (payloadSize + line.length + 2 > payloadLimit) {
                await sendPayload();
            }

            payloadChunk.push(line);
            payloadSize += line.length + 2;
        }

        if (payloadChunk.length > 0) {
            await sendPayload();
        }
    }
    await client.destroy()
}
