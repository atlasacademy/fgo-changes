import { config } from 'dotenv'; config();
import { join } from 'path';

import { prepareRepository } from './repository';
import { diff } from './diffBin';
import { diffMaster } from './diffMaster';
import { mstUpdate } from './updateMaster';
import { dump } from './dump';

const region = process.argv[2] || process.env.REGION
const path = join(__dirname, '..', `work`, `fgo-game-data-${region}`);

Promise.resolve()
    .then(() => prepareRepository(process.env.REPO, region, path))
    .then(() => diff(path))
    .then(diff => diffMaster(path, diff))
    .then(c => mstUpdate(c, path, region))
    .then(d => dump(d, path))