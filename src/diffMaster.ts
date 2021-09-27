import git from 'isomorphic-git'
import * as fs from 'fs';
import hash from 'object-hash';

export async function diffMaster(dir : string, changes : Map<string, [string, string]>) {
    // filename => changed/added obj
    let out = new Map<string, any[]>();
    let schemaChanges = [] as string[];
    console.log(`Calculating master data difference...`);
    for (let filename of [...changes.keys()]) {
        if (!filename.startsWith('master')) continue;
        let [newId, oldId] = changes.get(filename);
        let { blob: oldB } = await git.readBlob({ fs, dir, oid: oldId }),
            { blob: newB } = await git.readBlob({ fs, dir, oid: newId });
        let _old = JSON.parse(Buffer.from(oldB).toString('utf-8')) as any[],
            _new = JSON.parse(Buffer.from(newB).toString('utf-8')) as any[];

        let hashes = new Map<string, any>();
        let h = (_ : any) => { let __ = hash(_); hashes.set(__, _); return __ };

        let oldSet = new Set(_old.map(h)), newSet = new Set(_new.map(h));

        let changed = [...newSet].filter(v => !oldSet.has(v));
        console.log(`=> ${filename} changed (${changed.length} new) ${
            (changed.length === _new.length && _new.length)  ? '(schema potentially changed!)' : ''
        }`)
        if (changed.length === _new.length) {
            if (_new.length === 0) {
                console.log(`   This file seems to be wiped? Let's not consider this a schema change.`);
            }
            else {
                console.log(`   This file will be ignored in the changes calculation.`);
                schemaChanges.push(filename);
            }
        }
        else out.set(filename, changed.map(s => hashes.get(s)));
    }

    return <const>[out, schemaChanges];
}