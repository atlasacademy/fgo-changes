import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';

export async function prepareRepository(url : string, region : string, dir : string) {
    await git.clone({
        dir,
        url,
        onAuth: () => ({ username: process.env.TOKEN, password: "" }),
        singleBranch: true,
        ref: region,
        fs: require('fs'),
        depth: 2,
        http
    });
    console.log(`Cloned repository to ${dir}.`)
}
