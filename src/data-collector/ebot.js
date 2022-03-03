const path = require(`path`);
const fs = require(`fs/promises`);
const database = require(`../database`);
const events = require(`../events`);
const logger = require(`../logger`)(`eBot Collector`);
const databasePath = path.join(__dirname, `../../`, `tournaments.json`);

async function getTournamentsFromFile() {
    const data = JSON.parse(await fs.readFile(databasePath, `utf-8`));
    return data;
}

async function getTournaments() {
    logger.info(`Starting to get internal tournaments`);

    const tournaments = [];
    const tournamentsFromFile = await getTournamentsFromFile();
    const query = `SELECT id, name, link FROM seasons WHERE active = 1 AND id IN(${Object.keys(tournamentsFromFile).join(`,`)})`;
    const [dbTournaments] = await database.query(query);

    if (dbTournaments.length > 0) {
        dbTournaments.forEach(dbTournament => {
            if (tournamentsFromFile[dbTournament.id].providers.hltv) {
                const hltvId = tournamentsFromFile[dbTournament.id].providers.hltv;

                tournaments.push({
                    tournamentIds: [
                        dbTournament.id,
                        ...tournamentsFromFile[dbTournament.id].aliases
                    ],
                    tournamentName: dbTournament.name,
                    externalTournamentId: hltvId,
                    matchConfig: tournamentsFromFile[dbTournament.id].config
                });

                logger.info(`${dbTournament.name} (Internal ID: ${dbTournament.id}, External ID: ${hltvId})`);
            }
        });
    }

    logger.info(`Internal tournaments: ${tournaments.length}`);
    events.emit(`ebotTournamentsUpdate`, tournaments);
}

getTournaments();
setInterval(() => getTournaments(), 900 * 1000); // 15 min