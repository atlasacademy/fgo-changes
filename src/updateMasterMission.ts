import { WebhookClient, MessageEmbed } from 'discord.js';

export async function updateMasterMission (m : Map<string, any[]>, region : string) {
    // check for new master mission
    let changes = m.get(`master/mstEventMission.json`)?.filter(a => a.type === 2);

    if (changes?.length) {
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
                        value: changes.map(a => `- ${a.detail}`).join('\n')
                    }])
            ]
        });
        console.log(`Done.`);
        client.destroy();
    }
}