import { WebhookClient, MessageEmbed } from 'discord.js';
import { join } from 'path';
import { CondType, Mission, ClassName } from '@atlasacademy/api-connector';
import { toTitleCase } from '@atlasacademy/api-descriptor';

let { DetailCondType } = Mission;
let condTypes = Object.keys(CondType).filter(key => isNaN(+key)) as (keyof typeof CondType)[];

function resolveClass(classId : number) {
    return `${classId}`;
    // return toTitleCase(
    //     ClassName[
    //         Object.keys(ClassName)
    //             .filter(key => isNaN(+key))
    //             .find(ClassName[key] === classId)
    //     ]
    // )
}

function orConcat(strings : string[]) {
    if (strings.length < 2) return strings.join('');
    let last = strings.pop();
    return `${strings.join(', ')} or ${last}`;
}

export async function updateMasterMission (m : Map<string, any[]>, region : string, path : string) {
    // check for new master mission
    let changes = m.get(`master/mstEventMission.json`)?.filter(a => a.type === 2);

    if (changes?.length) {
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
        await client.send('', {
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
                        value: changes
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
                                                    return `Kill ${targetNum} ${
                                                        orConcat(targetIds.map((trait : number) => `[Trait : ${trait}]`))
                                                    } enem${
                                                        targetNum > 1 ? 'ies' : 'y'
                                                    }`;
                                                case DetailCondType.QUEST_CLEAR_NUM_2:
                                                    return `Clear ${targetNum} quest${targetNum > 1 ? 's' : ''}`;
                                                case DetailCondType.DEFEAT_SERVANT_CLASS:
                                                    return `Defeat ${targetNum} ${
                                                        orConcat(targetIds.map((classId : number) => resolveClass(classId)))
                                                    } servants${addTargetIds.length ? ` with ${
                                                        orConcat(addTargetIds.map((trait : number) => `[Trait : ${trait}]`))
                                                    }` : ''}`
                                                default:
                                                    return Object.keys(DetailCondType)
                                                        .filter(key => isNaN(+key))
                                                        .find(key => DetailCondType[key as keyof typeof DetailCondType] === _.missionCondType);
                                            }
                                        });
                                        detail = parsedDetails.join(', ')
                                    }
                                }
                                return `\`${a.id}\` | ${detail}`;
                            }).join('\n')
                    }])
            ]
        });
        console.log(`Done.`);
        client.destroy();
    }
}