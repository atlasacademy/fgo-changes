import {
    ASSET_BUNDLE_KEY,
    ASSET_HOST,
    ASSET_STORAGE,
    DB_HOST,
    DISCORD_AVATAR,
    MODEL_VIEWER_HOST,
    SCRIPT_ENCRYPT_SETTING,
    SCRIPT_FILE_LIST,
} from "./config";
import { MessageEmbed, WebhookClient } from "discord.js";

interface AssetBundleKey {
    id: string;
    decryptKey: string;
}

interface AssetDetail {
    changeList: Set<string>;
    filter?: (itemPath: string) => boolean;
    getName?: (itemId: string) => string;
    getLocation: (itemId: string) => string;
}

export const updateAsset = async (
    allChanges: Map<string, any[]>,
    currentFiles: Map<string, any[]>,
    region: string
) => {
    process.stdout.write(`Checking asset changes ... `);

    const uRegion = region.toUpperCase(),
        changes: Map<string, AssetDetail> = new Map([
            [
                "CharaFigure",
                {
                    changeList: new Set(),
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
                    changeList: new Set(),
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
                    changeList: new Set(),
                    getName: (itemId) => itemId.replace("back", ""),
                    getLocation: (itemId) =>
                        `${ASSET_HOST}/${uRegion}/Back/${itemId}_1344_626.png`,
                },
            ],
            [
                "Image",
                {
                    changeList: new Set(),
                    getLocation: (itemId) =>
                        `${ASSET_HOST}/${uRegion}/Image/${itemId}/${itemId}.png`,
                },
            ],
            [
                "Movie",
                {
                    changeList: new Set(),
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
                    changeList: new Set(),
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
                    changeList: new Set(),
                    filter: (path) =>
                        uRegion === "JP" &&
                        path.startsWith("Servants/") &&
                        path.split("/").length === 2,
                    getLocation: (itemId) =>
                        `${MODEL_VIEWER_HOST}/?id=${itemId}`,
                },
            ],
        ]);

    const assetBundleKey: AssetBundleKey[] | undefined =
            currentFiles.get(ASSET_BUNDLE_KEY),
        currentBundleKeys =
            assetBundleKey !== undefined
                ? new Set(assetBundleKey.map((key) => key.id))
                : undefined,
        canBeDecrypted =
            currentBundleKeys !== undefined
                ? (key?: string) =>
                      key === undefined || currentBundleKeys.has(key)
                : () => true;

    const assetStorageChanges: string[] = allChanges.get(ASSET_STORAGE);
    if (assetStorageChanges !== undefined) {
        for (const line of assetStorageChanges) {
            if (line[0] !== "~" && line[0] !== "@") {
                const [first, assetType, size, crc32, name, decryptKey] =
                    line.split(",");

                for (const [assetType, assetChange] of changes.entries()) {
                    if (
                        canBeDecrypted(decryptKey) &&
                        (assetChange.filter !== undefined
                            ? assetChange.filter(name)
                            : name.startsWith(`${assetType}/`))
                    ) {
                        assetChange.changeList.add(
                            name.slice(assetType.length + 1)
                        );
                    }
                }
            }
        }
    }

    const scriptEncryptSetting: { scriptName: string; keyType: string }[] =
            currentFiles.get(SCRIPT_ENCRYPT_SETTING) ?? [],
        scriptKeyMap = new Map(
            scriptEncryptSetting.map((setting) => [
                setting.scriptName,
                setting.keyType,
            ])
        );

    const scriptListChanges: string[] = allChanges.get(SCRIPT_FILE_LIST);
    const scriptChangeList = changes.get("Script").changeList;
    if (scriptListChanges !== undefined) {
        for (const script in scriptListChanges) {
            if (canBeDecrypted(scriptKeyMap.get(script.replace(".txt", "")))) {
                scriptChangeList.add(script);
            }
        }
    }

    const newBundleKeys: AssetBundleKey[] | undefined =
        allChanges.get(ASSET_BUNDLE_KEY);
    if (newBundleKeys !== undefined) {
        const newKeys = new Set(newBundleKeys.map((key) => key.id));

        const assetStorage: string[] = currentFiles.get(ASSET_STORAGE);
        if (assetStorage !== undefined) {
            for (const line of assetStorage) {
                if (line[0] !== "~" && line[0] !== "@") {
                    const [first, assetType, size, crc32, name, decryptKey] =
                        line.split(",");

                    for (const [assetType, assetChange] of changes.entries()) {
                        if (
                            newKeys.has(decryptKey) &&
                            (assetChange.filter !== undefined
                                ? assetChange.filter(name)
                                : name.startsWith(`${assetType}/`))
                        ) {
                            assetChange.changeList.add(
                                name.slice(assetType.length + 1)
                            );
                        }
                    }
                }
            }
        }

        for (const scriptSetting of scriptEncryptSetting) {
            if (newKeys.has(scriptSetting.keyType)) {
                scriptChangeList.add(scriptSetting.scriptName);
            }
        }
    }

    const [token, id] = process.env.WEBHOOK.split("/").reverse(),
        client = new WebhookClient(id, token);

    for (const [assetType, changeDetail] of changes.entries()) {
        if (changeDetail.changeList.size === 0) continue;

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
