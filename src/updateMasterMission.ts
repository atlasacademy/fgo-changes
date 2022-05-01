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
        let missionConditionDetails = new Map<
            number,
            { addTargetIds: number[], targetIds: number[], missionCondType: Mission.DetailCondType }
        >();

        for (let condition of require(join(path, 'master', 'mstEventMissionCondition.json')))
            if (missionIds.has(+condition.missionId) && condition.missionProgressType == 4) // CLEAR
                missionConditions.set(+condition.missionId, condition);

        for (let [_, condition] of missionConditions)
            if (+condition.condType == 22)
                (condition.targetIds as number[]).forEach(id => missionConditionDetails.set(id, null));

        for (let detailRecord of require(join(path, 'master', 'mstEventMissionConditionDetail.json')))
            if (missionConditionDetails.has(+detailRecord.id))
                missionConditionDetails.set(+detailRecord.id, detailRecord);

        process.stdout.write(`New master mission found. Dispatching updates... `);
        let [token, id] = process.env.WEBHOOK.split('/').reverse()

        const condDetails = Array.from(
            missionConditions.values()
        ).sort((a, b) => a.missionId - b.missionId).map(a => `- ${a.conditionMessage}`);

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
                                    let filteredCategories = [
                                        {
                                            ids: [6001, 6002, 6003, 6004, 6005, 6006, 6007],
                                            name: 'Gem'
                                        },
                                        {
                                            ids: [6101, 6102, 6103, 6104, 6105, 6106, 6107],
                                            name: 'Magic Gem'
                                        },
                                        {
                                            ids: [6201, 6202, 6203, 6204, 6205, 6206, 6207],
                                            name: 'Secret Gem'
                                        },
                                        {
                                            ids: [7001, 7002, 7003, 7004, 7005, 7006, 7007],
                                            name: 'Piece'
                                        },
                                        {
                                            ids: [7101, 7102, 7103, 7104, 7105, 7106, 7107],
                                            name: 'Monument'
                                        }
                                    ];

                                    for (let { ids, name } of filteredCategories) {
                                        let validGemCount = ids.reduce((prev, curr) => prev + +!!targetIds.includes(curr), 0);
                                        let exclusive = validGemCount >= 4;
                                        if (validGemCount === 7) itemTexts.push(name + 's');
                                        else itemTexts.push(
                                            (exclusive ? `${name + 's'} (except ` : '')
                                            + ids.filter(i =>
                                                exclusive ? !targetIds.includes(i) : targetIds.includes(i))
                                                .map(_ => items.get(_))
                                                .join(', ')
                                            + (exclusive ? ')' : '')
                                        )
                                    }

                                    let filter = new Set(filteredCategories.map(_ => _.ids).flat());
                                    itemTexts.push(...targetIds.filter(a => !filter.has(a)).map(itemId => items.get(itemId)));

                                    return `Acquire ${targetNum} ${orConcat(itemTexts.filter(text => text))} through battles`;
                                case DetailCondType.BATTLE_SVT_CLASS_IN_DECK:
                                    return `Complete ${targetNum} quest${targetNum > 1 ? "s" : ''} with at least one ${
                                        orConcat(targetIds.map((classId : number) => toTitleCase(enums.SvtClass[classId])))
                                    } servant in your party`;
                                case DetailCondType.SVT_GET_BATTLE:
                                    // TODO : handle other sorts of entity
                                    return `Acquire ${targetNum} of any type of Embers`
                                case DetailCondType.DEFEAT_ENEMY_CLASS:
                                    let allClasses = [
                                        1,  2,  3,  4,  5,  6,  7,
                                        8,  9, 10, 11, 12, 17, 20,
                                       22, 23, 24, 25, 27
                                    ]
                                    targetIds = targetIds.filter(id => allClasses.includes(id))

                                    let except = targetIds.length > allClasses.length / 2;
                                    let all = targetIds.length === allClasses.length;

                                    let description = (except ? 'with all class except ' : 'with class ') + orConcat(
                                        (except
                                        ? allClasses.filter(classId => !targetIds.includes(classId))
                                        : targetIds)
                                            .map(classId => toTitleCase(enums.SvtClass[classId]))
                                    );

                                    return `Defeat ${targetNum} enemies ${all ? '' : description}`;
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
            });

        let client = new WebhookClient(id, token);

        const sendMasterMissionMessage = async (descriptions: string[]) => {
            const DISCORD_EMBED_FIELD_VALUE_MAX_LENGTH = 1024;
            const chunkedDescriptions: string[] = [];
            let descriptionChunk = '';
            for (const discription of descriptions) {
                if (descriptionChunk.length + discription.length + 1 > DISCORD_EMBED_FIELD_VALUE_MAX_LENGTH) {
                    chunkedDescriptions.push(descriptionChunk);
                    descriptionChunk = '';
                }
                descriptionChunk += discription + '\n';
            }
            if (descriptionChunk !== '') chunkedDescriptions.push(descriptionChunk);

            for (const descriptionChunk of chunkedDescriptions) {
                const message = {
                    username: `FGO Changelog | ${region}`,
                    avatarURL: 'https://apps.atlasacademy.io/db/logo192.png',
                    embeds: [
                        new MessageEmbed()
                            .setTitle(`Master missions`)
                            .addFields([{
                                name: `Time`,
                                value: `From <t:${changes[0].startedAt}> to <t:${changes[0].endedAt}>`
                            }, {
                                name: `Missions`,
                                value: descriptionChunk
                            }])
                    ]
                }

                await client.send('', message);
            }
        }


        try {
            await sendMasterMissionMessage(condDetails);
            await sendMasterMissionMessage(condDescriptions);
        } catch (e) {
            console.error(e);
        }

        client.destroy();
        console.log(`Done.`);
    }
}