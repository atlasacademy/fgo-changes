import { execFileSync } from 'child_process';

export async function prepareRepository(url : string, region : string, dir : string) {
    execFileSync('git', [
        'clone',
        '--branch', region,
        `https://${process.env.TOKEN}@${url.replace("https://", "")}`,
        dir,
        '--depth', '2',
        '--single-branch'
    ])
    console.log(`Cloned repository to ${dir}.`)
}
