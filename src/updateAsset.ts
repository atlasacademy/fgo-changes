import {
    ASSET_HOST,
    DB_HOST,
    DISCORD_AVATAR,
    MODEL_VIEWER_HOST,
} from "./config";
import { MessageEmbed, WebhookClient } from "discord.js";

interface AssetDetail {
    changeList: string[];
    filter?: (itemPath: string) => boolean;
    getName?: (itemId: string) => string;
    getLocation: (itemId: string) => string;
}

export const updateAsset = async (
    allChanges: Map<string, any[]>,
    region: string
) => {
    process.stdout.write(`Checking asset changes ... `);

    const uRegion = region.toUpperCase(),
        changes: Map<string, AssetDetail> = new Map([
            [
                "CharaFigure",
                {
                    changeList: [],
                    filter: (path) =>
                        path.startsWith("CharaFigure/") &&
                        path.split("/").length === 2,
                    getLocation: (itemId) =>
                        `${ASSET_HOST}/${uRegion}/CharaFigure/${itemId}/${itemId}_merged.png`,
                },
            ],
            [
                "CharaFigure/Form",
                {
                    changeList: [],
                    getName: (itemId) => {
                        const [formId, charafigureId] = itemId.split("/");
                        return `${charafigureId}-${formId}`;
                    },
                    getLocation: (itemId) => {
                        const [formId, charafigureId] = itemId.split("/");
                        return `${ASSET_HOST}/${uRegion}/CharaFigure/Form/${formId}/${charafigureId}/${charafigureId}_merged.png`;
                    },
                },
            ],
            [
                "Back",
                {
                    changeList: [],
                    getName: (itemId) => itemId.replace("back", ""),
                    getLocation: (itemId) =>
                        `${ASSET_HOST}/${uRegion}/Back/${itemId}_1344_626.png`,
                },
            ],
            [
                "Image",
                {
                    changeList: [],
                    getLocation: (itemId) =>
                        `${ASSET_HOST}/${uRegion}/Image/${itemId}/${itemId}.png`,
                },
            ],
            [
                "Movie",
                {
                    changeList: [],
                    getName: (itemId) => itemId.replace(".usm", ""),
                    getLocation: (itemId) =>
                        `${ASSET_HOST}/${uRegion}/Movie/${itemId.replace(
                            ".usm",
                            ".mp4"
                        )}`,
                },
            ],
            [
                "Script",
                {
                    changeList: [],
                    getName: (itemId) => itemId.replace(".txt", ""),
                    getLocation: (itemId) =>
                        `${DB_HOST}/${uRegion}/script/${itemId.replace(
                            ".txt",
                            ""
                        )}`,
                },
            ],
            [
                "Servants",
                {
                    changeList: [],
                    filter: (path) =>
                        path.startsWith("Servants/") &&
                        path.split("/").length === 2,
                    getLocation: (itemId) =>
                        `${MODEL_VIEWER_HOST}/?id=${itemId}`,
                },
            ],
        ]);

    const assetStorageChanges: string[] = allChanges.get("AssetStorage.txt");
    if (assetStorageChanges !== undefined) {
        for (const line of assetStorageChanges) {
            if (line[0] !== "~" && line[0] !== "@") {
                const [first, assetType, size, crc32, name, decryptKey] =
                    line.split(",");

                for (const [assetType, assetChange] of changes.entries()) {
                    if (
                        assetChange.filter !== undefined
                            ? assetChange.filter(name)
                            : name.startsWith(`${assetType}/`)
                    ) {
                        assetChange.changeList.push(
                            name.slice(assetType.length + 1)
                        );
                    }
                }
            }
        }
    }

    const scriptListChanges: string[] = allChanges.get(
        "ScriptActionEncrypt/ScriptFileList/ScriptFileList.txt"
    );
    if (scriptListChanges !== undefined) {
        changes.get("Script").changeList = scriptListChanges;
    }

    const [token, id] = process.env.WEBHOOK.split("/").reverse(),
        client = new WebhookClient(id, token);

    for (const [assetType, changeDetail] of changes.entries()) {
        if (changeDetail.changeList.length === 0) continue;

        let payloadChunk: string[] = [],
            payloadSize = 0;

        const payloadLimit = 2048;
        const sendPayload = async () => {
            try {
                await client.send("", {
                    username: `FGO Changelog | ${uRegion}`,
                    avatarURL: DISCORD_AVATAR,
                    embeds: [
                        new MessageEmbed()
                            .setTitle(`${assetType} changes`)
                            .setDescription(payloadChunk.join(", ")),
                    ],
                });
            } catch (e) {
                console.error(e);
            }

            payloadChunk = [];
            payloadSize = 0;

            await new Promise((resolve) => setTimeout(resolve, 1000));
        };

        for (const itemId of changeDetail.changeList) {
            const itemLink = `[${
                changeDetail.getName !== undefined
                    ? changeDetail.getName(itemId)
                    : itemId
            }](${changeDetail.getLocation(itemId)})`;

            if (payloadSize + itemLink.length + 2 > payloadLimit) {
                await sendPayload();
            }

            payloadChunk.push(itemLink);
            payloadSize += itemLink.length + 2;
        }

        if (payloadChunk.length > 0) {
            await sendPayload();
        }
    }

    client.destroy();
};
