import { WebhookClient, MessageEmbed } from 'discord.js';
import * as fs from 'fs';
import { join } from 'path';
import { DB_HOST, DISCORD_AVATAR } from './config';

export async function mstUpdate(m : Map<string, any[]>, dir : string, region: string, ignoredFiles : string[] = []) {
    let payloads : { name: string, payload: string[] }[] = [];

    let dump = {
        svt: [],
        ce: [],
        skill: [],
        buff: [],
        np: [],
        func: []
    } as { [k: string]: any[] };

    {
        console.log(`Preparing servant changes...`);
        // prebuild the obj table
        let table : { id: number, type: number, collectionNo: number, name: string }[] =
            JSON.parse(fs.readFileSync(join(dir, `master`, 'mstSvt.json'), 'utf-8'));
        let lookup = new Map<number, [number, number, string]>();
        table.forEach(a => lookup.set(a.id, [a.type, a.collectionNo, a.name]));
        let changed = new Set<number>();
        [
            `master/mstSvt.json`,
            `master/mstSvtScript.json`,
            `master/mstSvtScriptAdd.json`
        ].forEach(file => m.get(file)?.forEach(a => changed.add(+a.id)));
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
        m.get(`master/mstSvtVoiceRelation.json`)?.forEach(a => changed.add(+a.relationSvtId));

        // collection no
        let CEs = [...changed].filter(a => lookup.has(a) ? lookup.get(a)[0] === 6 : false);
        let SVs = [...changed].filter(a => lookup.has(a) ? (lookup.get(a)[0] === 2 || lookup.get(a)[0] === 1) : false)

        let pCE = CEs
            .sort((a, b) => a - b)
            .map(a => {
                let [type, collectionNo] = lookup.get(a);
                // if CE collectionNo != 0 (normal ones)
                if (collectionNo)
                    return `[${collectionNo}](${DB_HOST}/${region}/craft-essence/${collectionNo})`;
                return `[[ID : ${a}]](${DB_HOST}/${region}/enemy/${a})`
            });
        let pSV = SVs
            .sort((a, b) => a - b)
            .map(a => {
                let [type, collectionNo] = lookup.get(a)
                if (collectionNo)
                    return `[${collectionNo}](${DB_HOST}/${region}/servant/${collectionNo})`;
                return `[[ID : ${a}]](${DB_HOST}/${region}/enemy/${a})`
            });
        payloads.push({ name: `Servant changes`, payload: pSV });
        payloads.push({ name: `Craft Essence changes`, payload: pCE });

        for (let svtId of [...changed]) {
            if (!lookup.has(svtId)) continue;
            let [type, collectionNo, name] = lookup.get(svtId);
            switch (type) {
                case 1:
                case 2:
                    dump.svt.push({ id: svtId, type, collectionNo, name });
                    break;
                case 6:
                    dump.ce.push({ id: svtId, type, collectionNo, name });
            }
        }
    }

    {
        console.log(`Preparing skill changes...`);
        let table : { id: number, name: string }[] =
            JSON.parse(fs.readFileSync(join(dir, `master`, 'mstSkill.json'), 'utf-8'));
        let lookup = new Map<number, string>(table.map(a => [a.id, a.name]));
        let changed = new Set<number>();
        [`master/mstSvtSkill.json`,`master/mstSkillLv.json`]
            .forEach(file => m.get(file)?.forEach(a => changed.add(+a.skillId)));
        [`master/mstSkill.json`, `master/mstSkillDetail.json`]
            .forEach(file => m.get(file)?.forEach(a => changed.add(+a.id)));
        let payload = [...changed]
            .sort((a, b) => a - b)
            .map(a => `[${a}](${DB_HOST}/${region}/skill/${a})`);
        payloads.push({ name: `Skill changes`, payload });
        [...changed].forEach(skillId => {
            if (lookup.has(skillId))
                dump.skill.push({ id: skillId, name: lookup.get(skillId) })
        });
    }

    {
        console.log(`Preparing Noble Phantasm changes...`);
        let table : { id: number, name: string }[] =
            JSON.parse(fs.readFileSync(join(dir, `master`, 'mstTreasureDevice.json'), 'utf-8'));
        let lookup = new Map<number, string>(table.map(a => [a.id, a.name]));
        let changed = new Set<number>();
        [`master/mstTreasureDevice.json`, `master/mstTreasureDeviceDetail.json`]
            .forEach(file => m.get(file)?.forEach(a => changed.add(+a.id)));
        [`master/mstTreasureDeviceLv.json`]
            .forEach(file => m.get(file)?.forEach(a => changed.add(+a.treaureDeviceId)));
        let payload = [...changed]
            .sort((a, b) => a - b)
            .map(id => `[${id}](${DB_HOST}/${region}/noble-phantasm/${id})`)
        payloads.push({ name: `Noble Phantasm changes`, payload });
        [...changed].forEach(npId => {
            if (lookup.has(npId))
                dump.np.push({ id: npId, name: lookup.get(npId) })
        });
    }

    {
        console.log(`Preparing buff changes...`);
        let table : { id: number, name: string }[] =
            JSON.parse(fs.readFileSync(join(dir, `master`, 'mstBuff.json'), 'utf-8'));
        let lookup = new Map<number, string>(table.map(a => [a.id, a.name]));
        let changed = new Set<number>();
        m.get(`master/mstBuff.json`)?.forEach(a => changed.add(+a.id));
        let payload = [...changed]
            .sort((a, b) => a - b)
            .map(id => `[${id}](${DB_HOST}/${region}/buff/${id})`)
        payloads.push({ name: `Buff changes`, payload });
        [...changed].forEach(bId => {
            if (lookup.has(bId))
                dump.buff.push({ id: bId, name: lookup.get(bId) })
        });
    }

    {
        console.log(`Preparing function changes...`);
        let table : { id: number, popupText: string }[] =
            JSON.parse(fs.readFileSync(join(dir, `master`, 'mstFunc.json'), 'utf-8'));
        let lookup = new Map<number, string>(table.map(a => [a.id, a.popupText]));
        let changed = new Set<number>();
        m.get(`master/mstFunc.json`)?.forEach(a => changed.add(+a.id));
        m.get(`master/mstFuncGroup.json`)?.forEach(a => changed.add(+a.funcId));
        let payload = [...changed]
            .sort((a, b) => a - b)
            .map(id => `[${id}](${DB_HOST}/${region}/func/${id})`)
        payloads.push({ name: `Function changes`, payload });
        [...changed].forEach(fId => {
            if (lookup.has(fId))
                dump.func.push({ id: fId, name: lookup.get(fId) })
        });
    }

    process.stdout.write(`Dispatching update notifications... `);

    let [token, id] = process.env.WEBHOOK.split('/').reverse()
    let client = new WebhookClient(id, token);
    for (let p of payloads) {
        let { name, payload } = p,
            payloadChunk: string[] = [],
            payloadSize = 0;

        const payloadLimit = 2048;
        const sendPayload = async () => {
            try {
                await client.send('', {
                    username: `FGO Changelog | ${region}`,
                    avatarURL: DISCORD_AVATAR,
                    embeds: [
                        new MessageEmbed()
                            .setTitle(name)
                            .setDescription(payloadChunk.join(', ')),
                    ]
                });
            } catch (e) {
                console.error(e);
            }

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

    if (ignoredFiles.length)
        await client.send('', {
            username: `FGO Changelog | ${region}`,
            avatarURL: DISCORD_AVATAR,
            embeds: [
                new MessageEmbed()
                    .setTitle('Potential schema changes')
                    .setDescription(
                        'Found at least a collection which has its schema modified (the new collection is wholly overwritten with new objects).'
                        + `\nThe changelog above will not consider ${
                            ignoredFiles.length > 1 ? 'these' : 'this'
                        } modified collection${ignoredFiles.length > 1 ? 's' : ''}.`
                    )
                    .addField(
                        `Changed collection`+ (ignoredFiles.length > 1 ? 's' : ''),
                        '```'
                        + ignoredFiles.join('\n')
                        + '```'
                    )
            ]
        })

    client.destroy();
    console.log(`Done.`)
    return dump;
}
