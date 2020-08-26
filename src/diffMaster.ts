import git from 'isomorphic-git'
import * as fs from 'fs';
import hash from 'object-hash';

export async function diffMaster(dir : string, changes : Map<string, [string, string]>) {
    // filename => changed/added obj
    let out = new Map<string, any[]>();
    
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
        out.set(filename, changed.map(s => hashes.get(s)));
        console.log(`=> ${filename} changed (${changed.length})`)
    }

    return out;
}