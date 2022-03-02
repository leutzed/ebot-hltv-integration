const database = require(`../database`);
const events = require(`../events`);
const tournamentsFromFile = require(`../../tournaments.json`);
const logger = require(`../logger`)(`eBot Collector`);

async function getTournaments() {
    const tournaments = [];
    const query = `SELECT id, name, link FROM seasons WHERE active = 1 AND id IN(${Object.keys(tournamentsFromFile).join(`,`)})`;

    logger.info(`Starting to get internal tournaments`);

    const [dbTournaments] = await database.query(query);

    if (dbTournaments.length > 0) {
        dbTournaments.forEach(dbTournament => {
            if (tournamentsFromFile[dbTournament.id].providers.hltv) {
                const hltvId = tournamentsFromFile[dbTournament.id].providers.hltv;

                tournaments.push({
                    tournamentId: dbTournament.id,
                    tournamentName: dbTournament.name,
                    externalTournamentId: hltvId,
                    matchConfig: tournamentsFromFile[dbTournament.id].config
                });

                logger.info(`${dbTournament.name} (Internal ID: ${dbTournament.id}, External ID: ${hltvId})`);
            }
        });
    }

    logger.info(`Tournaments: ${tournaments.length}`);
    events.emit(`ebotTournamentsUpdate`, tournaments);
}

getTournaments();
setInterval(() => getTournaments(), 600 * 1000); // 10 min