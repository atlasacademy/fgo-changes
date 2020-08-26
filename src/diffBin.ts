import git from 'isomorphic-git'
import * as fs from 'fs';
export async function diff(dir: string) {
    let currentSHA = await git.resolveRef({ fs, dir, ref: 'HEAD' });
    let { commit: { parent: { [0]: parentSHA } } } =
        await git.readCommit({ fs, dir, oid: currentSHA });
    console.log(`Latest commit : ${currentSHA}`);
    console.log(`Latest parent : ${parentSHA}`);
    process.stdout.write(`Comparing files... `);
    let current = git.TREE({ ref: currentSHA }),
        _parent = git.TREE({ ref: parentSHA });

        // fileName => [currentoid, parentoid]
    let changes = new Map<string, [string, string]>();
    await git.walk({
        fs, dir, trees: [current, _parent],
        async map(filename, [current, _parent]) {
            if (current === null || _parent === null)
                return 1;

            if (await current.type() === 'tree' || await _parent.type() === 'tree')
                return 1;

            let o1 = await current.oid(), o2 = await _parent.oid();
            if (o1 !== o2) changes.set(filename, [o1, o2]);

            return 1;
        }
    })
    console.log(`Done.`);
    // console.log(`Changed files : `);
    // console.log([...changes].map(([k]) => `* ${k}`).join('\n'));
    return changes;
}
