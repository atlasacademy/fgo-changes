import { WebhookClient, MessageEmbed } from 'discord.js';
import { join } from 'path';
import { CondType, Mission } from '@atlasacademy/api-connector';
import { toTitleCase } from '@atlasacademy/api-descriptor';
import axios from 'axios';

let { DetailCondType } = Mission;
let condTypes = Object.keys(CondType).filter(key => isNaN(+key)) as (keyof typeof CondType)[];

function orConcat(strings : string[]) {
    if (strings.length < 2) return strings.join('');
    let last = strings.pop();
    return `${strings.join(', ')} or ${last}`;
}

function andConcat(strings : string[]) {
    if (strings.length < 2) return strings.join('');
    let last = strings.pop();
    return `${strings.join(', ')} and ${last}`;
}

export async function updateMasterMission (m : Map<string, any[]>, region : string, path : string) {
    // check for new master mission
    let changes = m.get(`master/mstEventMission.json`)?.filter(a => a.type === 2);

    if (changes?.length) {
        let items = new Map<number, string>();
        await axios.get(`https://api.atlasacademy.io/export/${region}/nice_item.json`, { responseType: 'json' })
            .then(res => res.data.forEach((item : any) => items.set(item.id, item.name)));

        let enums : any;
        await axios.get(`https://api.atlasacademy.io/export/JP/nice_enums.json`, { responseType: 'json' })
            .then(res => enums = res.data);

        let traits : { [k : number]: string } = {};
        await axios.get(`https://api.atlasacademy.io/export/JP/nice_trait.json`, { responseType: 'json' })
            .then(res => traits = res.data);

        let missionIds = new Set(changes.map(mission => +mission.id));
        // missionId => mission
        let missionConditions = new Map<number, any>();
        // detailId => detail
        let missionConditionDetails = new Map<number, any>();

        for (let condition of require(join(path, 'master', 'mstEventMissionCondition.json')))
            if (missionIds.has(+condition.missionId))
                missionConditions.set(+condition.missionId, condition);

        for (let [_, condition] of missionConditions)
            if (+condition.condType == 22)
                (condition.targetIds as number[]).forEach(id => missionConditionDetails.set(id, null));

        for (let detailRecord of require(join(path, 'master', 'mstEventMissionConditionDetail.json')))
            if (missionConditionDetails.has(+detailRecord.id))
                missionConditionDetails.set(+detailRecord.id, detailRecord);

        process.stdout.write(`New master mission found. Dispatching updates... `);
        let [token, id] = process.env.WEBHOOK.split('/').reverse()
        let client = new WebhookClient(id, token);

        const condDetails = changes.map(a => `- ${a.detail}`).join('\n');

        const condDescriptions = changes
            .sort((a, b) => a.id - b.id)
            .map(a => {
                let mstEventMissionCondition = missionConditions.get(a.id);
                let _condType = condTypes[mstEventMissionCondition.condType];
                let { detail } = a;
                let { targetNum } = mstEventMissionCondition;
                switch (_condType) {
                    case 'MISSION_CONDITION_DETAIL': {
                        let details = (mstEventMissionCondition.targetIds as number[])
                            .map(id => missionConditionDetails.get(id));
                        let parsedDetails = details.map(_ => {
                            let { addTargetIds, targetIds } = _;
                            switch (_.missionCondType) {
                                case DetailCondType.ENEMY_INDIVIDUALITY_KILL_NUM:
                                    // not based on servant
                                    let excludeServants = targetIds.includes(5010);
                                    targetIds = targetIds.filter((a : number) => a != 5010);
                                    return `Kill ${targetNum}${
                                        (targetIds.length ? ' ' : '')
                                            + orConcat(targetIds.map(
                                                (trait : number) => toTitleCase(traits[trait]) || `[Trait : ${trait}]`
                                            ))
                                    } enem${
                                        targetNum > 1 ? 'ies' : 'y'
                                    }${excludeServants ? ` (excluding Servants & certain bosses)` : ''}`;
                                case DetailCondType.DEFEAT_ENEMY_INDIVIDUALITY:
                                    return `Kill ${targetNum}${
                                        (targetIds.length ? ' ' : '')
                                            + andConcat(targetIds.filter((a : number) => a != 1000).map(
                                                (trait : number) => toTitleCase(traits[trait]) || `[Trait : ${trait}]`
                                            ))} ${
                                                targetIds.includes(1000)
                                                    ? `servant${targetNum > 1 ? 's' : ''}`
                                                    : `enem${targetNum > 1 ? 'ies' : 'y'}`
                                            }`;
                                case DetailCondType.QUEST_CLEAR_NUM_2:
                                    return `Clear ${targetNum} quest${targetNum > 1 ? 's' : ''}`;
                                case DetailCondType.DEFEAT_ENEMY_NOT_SERVANT_CLASS:
                                case DetailCondType.DEFEAT_SERVANT_CLASS:
                                    // servant trait
                                    addTargetIds = addTargetIds.filter((a : number) => a != 1000);
                                    return `Defeat ${targetNum} ${
                                        orConcat(targetIds.map((classId : number) => toTitleCase(enums.SvtClass[classId])))
                                    } ${
                                        _.missionCondType == DetailCondType.DEFEAT_SERVANT_CLASS
                                            ? 'servants' : ''
                                    }${addTargetIds.length ? ` with ${
                                        orConcat(addTargetIds.map((trait : number) => `[Trait : ${trait}]`))
                                    }` : ''}${
                                        _.missionCondType == DetailCondType.DEFEAT_SERVANT_CLASS
                                            ? '' : '(excluding Servants & certain bossses)'
                                    }`
                                case DetailCondType.FRIEND_POINT_SUMMON:
                                    return `Perform ${targetNum} Friend Point summons`;
                                case DetailCondType.ITEM_GET_BATTLE:
                                    let itemTexts : string[] = [];
                                    let normalGems = [6001, 6002, 6003, 6004, 6005, 6006, 6007];
                                    let allGems = normalGems
                                        .reduce((prev, curr) => prev + +!!targetIds.includes(curr), 0);
                                    if (allGems === 7)
                                        itemTexts.push(`Gems`)
                                    else
                                        itemTexts.push(
                                            (allGems < 4 ? '' : 'Gems (except ')
                                            + normalGems.filter(i =>
                                                allGems < 4 ? targetIds.includes(i) : !targetIds.includes(i))
                                                .map(_ => items.get(_))
                                                .join(', ')
                                            + (allGems < 4 ? '' : ')')
                                        )

                                    return `Acquire ${targetNum} ${orConcat(itemTexts)}`;
                                default:
                                    return Object.keys(DetailCondType)
                                        .filter(key => isNaN(+key))
                                        .find(key => DetailCondType[key as keyof typeof DetailCondType] === _.missionCondType);
                            }
                        });
                        detail = parsedDetails.join(', ');
                        break;
                    }
                    case 'EVENT_MISSION_CLEAR': {
                        let { targetIds } = mstEventMissionCondition;
                        if (changes.map(_ => +_.id).filter(_ => _ != a.id).every(missionId => targetIds.includes(missionId)))
                            detail = `Clear all other missions`;
                        else
                            detail = `Clear missions with ID ${targetIds.join(', ')}`;
                            break;
                    }
                    default: console.log(mstEventMissionCondition);
                }
                return `\`${a.id}\` | ${detail}`;
            }).join('\n');

        const masterMissionMessage = (descriptions: string) => {
            return {
                username: `FGO Changelog | ${region}`,
                avatarURL: 'https://apps.atlasacademy.io/db/logo192.png',
                embeds: [
                    new MessageEmbed()
                        .setTitle(`Master missions`)
                        .addFields([{
                            name: `Time`,
                            value: '```FROM | ' + `${new Date(changes[0].startedAt * 1000).toUTCString()}`
                                    + '\n TO  | ' + `${new Date(changes[0].endedAt * 1000).toUTCString()}`
                                    + '```'
                        }, {
                            name: `Missions`,
                            value: descriptions
                        }])
                ]
            }
        }

        await client.send('', masterMissionMessage(condDetails));
        await client.send('', masterMissionMessage(condDescriptions));

        console.log(`Done.`);
        client.destroy();
    }
}