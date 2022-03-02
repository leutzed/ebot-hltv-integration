const axios = require(`axios`);
const cheerio = require(`cheerio`);
const events = require(`../events`);
const logger = require(`../logger`)(`HLTV Collector`);
const hltvAddress = `https://www.hltv.org`;

events.on(`ebotTournamentsUpdate`, async ebotTournaments => {
    logger.info(`Starting to get external tournaments and matches`);

    const tournaments = ebotTournaments;
    const rawhltvMatches = [];
    const hltvMatches = [];

    async function getHltvMatches(matchIndex = 0) {
        if (!rawhltvMatches[matchIndex]) {
            logger.info(`Tournaments: ${tournaments.length}, Matches: ${hltvMatches.length}`);
            return events.emit(`hltvMatchesUpdate`, hltvMatches);
        }

        const teams = [{ name: null, flag: null }, { name: null, flag: null }];
        const page = cheerio.load((await axios.get(`${hltvAddress}/matches/${rawhltvMatches[matchIndex].id}/matches`)).data);

        page(`.teamsBox .team`).each((index, team) => {
            const name = page(team).find(`.teamName`).text();
            const rawFlag = page(team).find(`img.team${index + 1}`).attr(`src`);
            const flag = rawFlag.split(`/`)[rawFlag.split(`/`).length - 1].split(`.`)[0];

            teams[index].name = name;
            teams[index].flag = flag;
        });

        if (!teams[0].name || !teams[1].name || !teams[0].flag || !teams[1].flag) {
            return setTimeout(() => getHltvMatches(matchIndex + 1), 2000);
        }

        const hltvMatchObject = {
            id: rawhltvMatches[matchIndex].id,
            internalTournament: rawhltvMatches[matchIndex].internalTournament,
            externalTournament: rawhltvMatches[matchIndex].externalTournament,
            teams,
            config: rawhltvMatches[matchIndex].config
        };

        hltvMatches.push(hltvMatchObject);

        let logMessage = `${hltvMatchObject.teams[0].name} vs ${hltvMatchObject.teams[1].name} `;
        logMessage += `(ID: ${hltvMatchObject.id}, External ID: ${hltvMatchObject.externalTournament.id}, `;
        logMessage += `Internal ID: ${hltvMatchObject.internalTournament.id})`;

        logger.info(logMessage);
        return setTimeout(() => getHltvMatches(matchIndex + 1), 2000);
    }

    async function getHltvRawMatches(tournamentIndex = 0) {
        if (!tournaments[tournamentIndex]) {
            return getHltvMatches();
        }

        const externalId = ebotTournaments[tournamentIndex].externalTournamentId;
        const page = cheerio.load((await axios.get(`${hltvAddress}/events/${externalId}/matches`)).data);

        if (page(`.upcomingMatchesSection`).eq(0).length > 0) {
            page(`.upcomingMatchesSection`).eq(0).find(`.upcomingMatch`).each(async (index, hltvMatch) => {
                const matchId = parseInt(page(hltvMatch).find(`a.match`).attr(`href`).split(`/`)[2]);
                const tournamentName = page(`.event-hub-title`).text();
                rawhltvMatches.push({
                    id: matchId,
                    internalTournament: {
                        id: tournaments[tournamentIndex].tournamentId,
                        name: tournaments[tournamentIndex].tournamentName
                    },
                    externalTournament: {
                        id: tournaments[tournamentIndex].externalTournamentId,
                        name: tournamentName
                    },
                    config: tournaments[tournamentIndex].matchConfig
                });
            });
        }

        return setTimeout(() => getHltvRawMatches(tournamentIndex + 1), 2000);
    }

    getHltvRawMatches();
});