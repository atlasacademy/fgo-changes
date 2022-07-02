import { execFileSync } from 'child_process';

export async function prepareRepository(url : string, region : string, dir : string) {
    execFileSync('git', [
        '-c', `credential.username=${process.env.TOKEN}`,

        'clone',

        '-b', region,
        url,

        dir,
        '--depth', '2',

        '--single-branch'
    ], {
        env: {
            ...process.env,
            'GIT_ASKPASS': 'echo'
        }
    })
    console.log(`Cloned repository to ${dir}.`)
}
