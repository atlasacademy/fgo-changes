import git from 'isomorphic-git'
import * as fs from 'fs';
import hash from 'object-hash';
import { ASSET_STORAGE, SCRIPT_FILE_LIST, ASSET_BUNDLE_KEY, SCRIPT_ENCRYPT_SETTING } from './config';
import path from 'path';

const BIG_FILES_SKIP = ["mstSvtVoice", "mstAi", "mstQuest", "mstShop"].map(fileName => `master/${fileName}.json`);

const TEXT_FILES = [ASSET_STORAGE, SCRIPT_FILE_LIST];
const SPECIAL_FILES = [ASSET_STORAGE, SCRIPT_FILE_LIST, SCRIPT_ENCRYPT_SETTING, ASSET_BUNDLE_KEY];

const diffLine = (oldString: string, newString: string) => {
    const oldLines = new Set(oldString.split("\n")),
        newLines = newString.split("\n");

    return newLines.filter(line => !oldLines.has(line));
}

export async function diffMaster(dir : string, changes : Map<string, [string, string]>) {
    // filename => changed/added obj
    let out = new Map<string, any[]>();
    let schemaChanges = [] as string[];
    const currentFiles = new Map<string, any[]>();

    for (const filename of SPECIAL_FILES) {
        if (fs.existsSync(filename)) {
            const fileContent = fs.readFileSync(path.join(dir, filename)).toString('utf-8');
            if (TEXT_FILES.includes(filename)) {
                currentFiles.set(filename, fileContent.split("\n"));
            } else {
                currentFiles.set(filename, JSON.parse(fileContent) as any[]);
            }
        }
    }

    console.log(`Calculating master data difference...`);
    for (let filename of [...changes.keys()]) {
        if (BIG_FILES_SKIP.includes(filename)) continue;
        if (!SPECIAL_FILES.includes(filename) && !filename.startsWith('master')) continue;
        let [newId, oldId] = changes.get(filename);
        let { blob: oldB } = await git.readBlob({ fs, dir, oid: oldId }),
            { blob: newB } = await git.readBlob({ fs, dir, oid: newId });

        const oldString = Buffer.from(oldB).toString('utf-8'),
            newString = Buffer.from(newB).toString('utf-8');

        if (TEXT_FILES.includes(filename)) {
            out.set(filename, diffLine(oldString, newString));
            continue;
        }

        let _old = JSON.parse(oldString) as any[],
            _new = JSON.parse(newString) as any[];

        let hashes = new Map<string, any>();
        let h = (_ : any) => { let __ = hash(_); hashes.set(__, _); return __ };

        let oldSet = new Set(_old.map(h)), newSet = new Set(_new.map(h));

        let changed = [...newSet].filter(v => !oldSet.has(v));
        console.log(`=> ${filename} changed (${changed.length} new) ${
            (changed.length === _new.length && _new.length)  ? '(schema potentially changed!)' : ''
        }`)
        if (changed.length === _new.length) {
            if (_new.length === 0 || oldSet.size === 0) {
                console.log(`   This file seems to be wiped/added from zero? Let's not consider this a schema change.`);
            }
            else {
                console.log(`   This file will be ignored in the changes calculation.`);
                schemaChanges.push(filename);
            }
        }
        else out.set(filename, changed.map(s => hashes.get(s)));
    }

    return <const>[out, schemaChanges, currentFiles];
}
