import { config } from 'dotenv'; config();
import { join } from 'path';
import { prepareRepository } from './repository';
import { diff } from './diffBin';
import { diffMaster } from './diffMaster';
import { mstUpdate } from './updateMaster';
import { dump } from './dump';
import rimraf from 'rimraf';
import { updateMasterMission } from './updateMasterMission';
import { updateAsset } from './updateAsset';

const region = process.argv[2] || process.env.REGION
const path = join(__dirname, '..', `work`, `fgo-game-data-${region}`);
// ensure a clean directory
rimraf.sync(path);
Promise.resolve()
    .then(() => prepareRepository(process.env.REPO, region, path))
    .then(() => diff(path))
    .then(diff => diffMaster(path, diff))
    .then(async _ => {
        let [c, schemaChanges] = _;
        await updateMasterMission(c, region, path);
        const masterChanges = await mstUpdate(c, path, region, schemaChanges);
        await updateAsset(c, region);
        return masterChanges;
    })
    .then(d => dump(d, path, region))
