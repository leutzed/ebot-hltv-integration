const axios = require(`axios`);
const cheerio = require(`cheerio`);
const events = require(`../events`);
const logger = require(`../logger`)(`HLTV Collector`);
const hltvAddress = `https://www.hltv.org`;

events.on(`ebotTournamentsUpdate`, async ebotTournaments => {
    if (ebotTournaments.length <= 0) {
        logger.info(`There are no active eBot tournaments`);
        return;
    }

    logger.info(`Starting to get external tournaments and matches`);

    const tournaments = ebotTournaments;
    const rawhltvMatches = [];
    const hltvMatches = [];
    const currentDate = new Date().getTime();

    async function getHltvMatches(matchIndex = 0) {
        if (!rawhltvMatches[matchIndex]) {
            logger.info(`Tournaments: ${tournaments.length}, Matches: ${hltvMatches.length}`);
            return events.emit(`hltvMatchesUpdate`, hltvMatches);
        }

        const page = cheerio.load((await axios.get(`${hltvAddress}/matches/${rawhltvMatches[matchIndex].id}/matches`)).data);
        const teams = [{ name: null, flag: null }, { name: null, flag: null }];

        page(`.teamsBox .team`).each((index, team) => {
            const name = page(team).find(`.teamName`).text();
            const rawFlag = page(team).find(`img.team${index + 1}`).attr(`src`);
            const flag = rawFlag.split(`/`)[rawFlag.split(`/`).length - 1].split(`.`)[0];

            teams[index].name = name;
            teams[index].flag = flag;
        });

        if (!teams[0].name || !teams[1].name || !teams[0].flag || !teams[1].flag) {
            logger.info(`Skipping an external match with ID ${rawhltvMatches[matchIndex].id} because there are no participants`);
            return setTimeout(() => getHltvMatches(matchIndex + 1), 2000);
        }

        const hltvMatchObject = {
            id: rawhltvMatches[matchIndex].id,
            time: rawhltvMatches[matchIndex].time,
            format: rawhltvMatches[matchIndex].format,
            internalTournament: rawhltvMatches[matchIndex].internalTournament,
            externalTournament: rawhltvMatches[matchIndex].externalTournament,
            teams,
            config: rawhltvMatches[matchIndex].config
        };

        hltvMatches.push(hltvMatchObject);

        logger.info(`${hltvMatchObject.teams[0].name} vs ${hltvMatchObject.teams[1].name} (Match ID: ${hltvMatchObject.id}, Tournament ID: ${hltvMatchObject.externalTournament.id})`);
        return setTimeout(() => getHltvMatches(matchIndex + 1), 2000);
    }

    async function getHltvRawMatches(tournamentIndex = 0) {
        if (!tournaments[tournamentIndex]) {
            return getHltvMatches();
        }

        const externalId = ebotTournaments[tournamentIndex].externalTournamentId;
        const page = cheerio.load((await axios.get(`${hltvAddress}/events/${externalId}/matches`)).data);

        if (page(`.upcomingMatch`).length > 0) {
            page(`.upcomingMatch`).each(async (index, hltvMatch) => { // eslint-disable-line no-shadow
                const matchId = parseInt(page(hltvMatch).find(`a.match`).attr(`href`).split(`/`)[2]);
                const tournamentName = page(`.event-hub-title`).text();
                const format = page(hltvMatch).find(`.matchInfo .matchMeta`).text().toLowerCase();
                const time = new Date(page(hltvMatch).find(`.matchInfo .matchTime`).data(`unix`));
                const timeDiff = (time - currentDate) / 1000 / 60 / 60;

                if (timeDiff > 5) {
                    logger.info(`Skipping an external match with ID ${matchId} because it does not match the period`);
                    return;
                }

                rawhltvMatches.push({
                    id: matchId,
                    time,
                    format: format.includes(`bo`) ? format : `bo1`,
                    internalTournament: {
                        ids: tournaments[tournamentIndex].tournamentIds,
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