import {
  copySync,
  existsSync,
  readFileSync,
  removeSync,
  writeFileSync,
  ensureDirSync
} from 'fs-extra';
import {resolve} from 'path';
import {
  Airport,
  Fir,
  Metadata,
  Ndb,
  Segment,
  Vor,
  Waypoint,
  Area
} from '../utils/interfaces';
import {formatAirways} from './utils/formatAirways';
import {zipDirectory} from './utils/zipFolder';

const basePath = resolve(__dirname);
const rootPath = resolve(basePath, '..');
const dataPath = resolve(rootPath, 'data');
const generatedDataPath = resolve(dataPath, 'generated');
const buildPath = resolve(rootPath, 'build');
const resultPath = resolve(rootPath, 'result');
const outPath = resolve(buildPath, 'aurora');
const outFile = resolve(outPath, `vtbb.isc`);

const metadataFile = resolve(dataPath, 'metadata.json');
const airportsFile = resolve(generatedDataPath, 'airports.json');
const waypointsFile = resolve(generatedDataPath, 'waypoints.json');
const ndbsFile = resolve(generatedDataPath, 'ndbs.json');
const vorsFile = resolve(generatedDataPath, 'vors.json');
const airwaysFile = resolve(generatedDataPath, 'airways.json');
const firsFile = resolve(generatedDataPath, 'firs.json');
const areasFile = resolve(generatedDataPath, 'areas.json');
const geoFile = resolve(dataPath, 'geo.json');
const auroraPath = resolve(dataPath, 'aurora');
const extraFilesFile = resolve(auroraPath, 'files.json');
const resultFile = resolve(resultPath, 'vtbb-aurora.zip');

let out = '';

const metadata = JSON.parse(readFileSync(metadataFile).toString()) as Metadata;
const airports = JSON.parse(readFileSync(airportsFile).toString()) as Airport[];
const waypoints = JSON.parse(
  readFileSync(waypointsFile).toString()
) as Waypoint[];
const ndbs = JSON.parse(readFileSync(ndbsFile).toString()) as Ndb[];
const vors = JSON.parse(readFileSync(vorsFile).toString()) as Vor[];
const airways = JSON.parse(readFileSync(airwaysFile).toString()) as Segment[][];
const firs = JSON.parse(readFileSync(firsFile).toString()) as Fir[];
const areas = JSON.parse(readFileSync(areasFile).toString()) as Area[];
const geo = JSON.parse(readFileSync(geoFile).toString()) as {
  lat: number;
  lon: number;
}[][];

const auroraIncludePath = resolve(outPath, 'Include', metadata.include);

const extraFiles = JSON.parse(readFileSync(extraFilesFile).toString()) as {
  taxiway: string[];
  gates: string[];
  geo: string[];
  fillcolor: string[];
  sid: string[];
  star: string[];
  vfrfix: string[];
  mva: string[];
};

removeSync(outPath);

out += '[INFO]\n';
out += `${metadata.defaultCentrePoint[0].toFixed(7)}\n`;
out += `${metadata.defaultCentrePoint[1].toFixed(7)}\n`;
out += `${metadata.ratio[0]}\n`;
out += `${metadata.ratio[1]}\n`;
out += `${metadata.magVar}\n`;
out += `${metadata.include}\n`;

// TODO: DEFINE
// TODO: ATC

out += '[AIRPORT]\n';
for (const airport of airports) {
  out += `${airport.ident};${airport.altitude};11000;${airport.laty.toFixed(
    6
  )};${airport.lonx.toFixed(7)};${airport.name};\n`;
}

out += '[RUNWAY]\n';

for (const airport of airports) {
  for (const runway of airport.runways) {
    out += `${airport.ident};${runway.runway1};${runway.runway2};${
      runway.alt1
    };${runway.alt2};${(runway.hdg1 - airport.mag_var).toFixed(0)};${(
      runway.hdg2 - airport.mag_var
    ).toFixed(0)};${runway.lat1.toFixed(7)};${runway.lon1.toFixed(
      6
    )};${runway.lat2.toFixed(7)};${runway.lon2.toFixed(7)};\n`;
  }
}

out += '[TAXIWAY]\n';

for (const airport of airports) {
  const fileName = `${airport.ident}.txi`;
  const checkFile = resolve(auroraPath, fileName);
  if (existsSync(checkFile)) {
    copySync(checkFile, resolve(auroraIncludePath, fileName));
  }
}

for (const tf of extraFiles.taxiway) {
  out += `F;${tf}\n`;
  copySync(resolve(auroraPath, tf), resolve(auroraIncludePath, tf));
}

out += '[GATES]\n';

for (const airport of airports) {
  const fileName = `${airport.ident}.gts`;
  const checkFile = resolve(auroraPath, fileName);
  if (existsSync(checkFile)) {
    copySync(checkFile, resolve(auroraIncludePath, fileName));
  }
}

for (const gf of extraFiles.gates) {
  out += `F;${gf}\n`;
  copySync(resolve(auroraPath, gf), resolve(auroraIncludePath, gf));
}

out += '[FIXES]\n';

// TODO: Fix type/Fix boundary

for (const waypoint of waypoints) {
  out += `${waypoint.ident};${waypoint.laty.toFixed(7)};${waypoint.lonx.toFixed(
    6
  )};0;0;\n`;
}

out += '[NDB]\n';

for (const ndb of ndbs) {
  out += `${ndb.ident};${(ndb.frequency / 100).toFixed(3)};${ndb.laty.toFixed(
    6
  )};${ndb.lonx.toFixed(7)};\n`;
}

out += '[VOR]\n';

for (const vor of vors) {
  out += `${vor.ident};${(vor.frequency / 1000).toFixed(3)};${vor.laty.toFixed(
    6
  )};${vor.lonx.toFixed(7)};\n`;
}

out += '[LOW AIRWAY]\n';

out += formatAirways(airways, 'V');

out += '[HIGH AIRWAY]\n';

out += formatAirways(airways, 'J');

out += '[AIRSPACE]\n';

for (const fir of firs) {
  for (const point of fir.points) {
    out += `T;${fir.code}_CTR;${point[0].toFixed(7)};${point[1].toFixed(7)};\n`;
  }
  out += `T;${fir.code}_CTR;${fir.points[0][0].toFixed(
    6
  )};${fir.points[0][1].toFixed(7)};\n`;
}

out += '[SID]\n';

for (const airport of airports) {
  const fileName = `${airport.ident}.sid`;
  const checkFile = resolve(auroraPath, fileName);
  if (existsSync(checkFile)) {
    copySync(checkFile, resolve(auroraIncludePath, fileName));
  }
}

for (const ef of extraFiles.sid) {
  out += `F;${ef}\n`;
  copySync(resolve(auroraPath, ef), resolve(auroraIncludePath, ef));
}

out += '[STAR]\n';

for (const airport of airports) {
  const fileName = `${airport.ident}.str`;
  const checkFile = resolve(auroraPath, fileName);
  if (existsSync(checkFile)) {
    copySync(checkFile, resolve(auroraIncludePath, fileName));
  }
}

for (const ef of extraFiles.star) {
  out += `F;${ef}\n`;
  copySync(resolve(auroraPath, ef), resolve(auroraIncludePath, ef));
}

out += '[VFRFIX]\n';

for (const airport of airports) {
  const fileName = `${airport.ident}.vfi`;
  const checkFile = resolve(auroraPath, fileName);
  if (existsSync(checkFile)) {
    copySync(checkFile, resolve(auroraIncludePath, fileName));
  }
}

for (const ef of extraFiles.vfrfix) {
  out += `F;${ef}\n`;
  copySync(resolve(auroraPath, ef), resolve(auroraIncludePath, ef));
}

out += '[MVA]\n';

for (const airport of airports) {
  const fileName = `${airport.ident}.mva`;
  const checkFile = resolve(auroraPath, fileName);
  if (existsSync(checkFile)) {
    copySync(checkFile, resolve(auroraIncludePath, fileName));
  }
}

for (const ef of extraFiles.mva) {
  out += `F;${ef}\n`;
  copySync(resolve(auroraPath, ef), resolve(auroraIncludePath, ef));
}

out += '[GEO]\n';

for (const gf of extraFiles.geo) {
  out += `F;${gf}\n`;
  copySync(resolve(auroraPath, gf), resolve(auroraIncludePath, gf));
}

const skip = 20;

for (const segment of geo) {
  let i: number;
  for (i = 0; i <= segment.length - 1; i += skip) {
    if (i + skip <= segment.length - 1) {
      out += `${segment[i].lat.toFixed(7)};${segment[i].lon.toFixed(
        7
      )};${segment[i + skip].lat.toFixed(7)};${segment[i + skip].lon.toFixed(
        7
      )};Coast;\n`;
    }
  }
  i -= skip;
  if (i !== segment.length - 1) {
    out += `${segment[i].lat.toFixed(7)};${segment[i].lon.toFixed(7)};${segment[
      segment.length - 1
    ].lat.toFixed(7)};${segment[segment.length - 1].lon.toFixed(7)};Coast;\n`;
  }
}

for (const area of areas) {
  if (area.restrictive_type) {
    const colour =
      area.restrictive_type === 'D'
        ? 'Danger'
        : area.restrictive_type === 'R'
        ? 'Restrict'
        : area.restrictive_type === 'P'
        ? 'Prohibit'
        : 'Unknown';
    for (const line of area.points.map((point, index, arr): [
      [number, number],
      [number, number]
    ] => {
      if (index === arr.length - 1) {
        return [point, arr[0]];
      }
      return [point, arr[index + 1]];
    })) {
      out += `${line[0][1].toFixed(7)};${line[0][0].toFixed(7)};${line[1][1].toFixed(7)};${line[1][0].toFixed(7)};${colour};\n`
    }
  }
}

out += '[FILLCOLOR]\n';

for (const airport of airports) {
  const fileName = `${airport.ident}.tfl`;
  const checkFile = resolve(auroraPath, fileName);
  if (existsSync(checkFile)) {
    copySync(checkFile, resolve(auroraIncludePath, fileName));
  }
}

for (const ff of extraFiles.fillcolor) {
  out += `F;${ff}\n`;
  copySync(resolve(auroraPath, ff), resolve(auroraIncludePath, ff));
}

writeFileSync(outFile, out);

ensureDirSync(resultPath);

zipDirectory(outPath, resultFile);
