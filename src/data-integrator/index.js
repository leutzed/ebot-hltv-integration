const levenshtein = require(`fast-levenshtein`);
const md5 = require(`md5`);
const database = require(`../database`);
const events = require(`../events`);
const logger = require(`../logger`)(`Data Integrator`);

function findMatch(hltvMatch, ebotMatches) {
    const minDinstance = 7;
    const hltvTeamA = hltvMatch.teams[0].name.toLowerCase();
    const hltvTeamB = hltvMatch.teams[1].name.toLowerCase();
    let requiredMatch = null;

    ebotMatches.forEach(ebotMatch => {
        /* eslint-disable */
        const distanceA = Math.min(levenshtein.get(hltvTeamA, ebotMatch.teamA.toLowerCase()), levenshtein.get(hltvTeamA, ebotMatch.teamB.toLowerCase()));
        const distanceB = Math.min(levenshtein.get(hltvTeamB, ebotMatch.teamA.toLowerCase()), levenshtein.get(hltvTeamB, ebotMatch.teamB.toLowerCase()));
        /* eslint-enable */
        const distance = distanceA + distanceB;

        if (distance <= minDinstance) {
            requiredMatch = [distance, ebotMatch];
        }
    });

    return requiredMatch;
}

function matchQueryBuilder(match) {
    // eslint-disable-next-line max-len, no-template-curly-in-string, quotes
    let query = "INSERT INTO `matchs`(`id`, `ip`, `server_id`, `season_id`, `team_a`, `team_a_flag`, `team_a_name`, `team_b`, `team_b_flag`, `team_b_name`, `status`, `is_paused`, `score_a`, `score_b`, `max_round`, `rules`, `overtime_startmoney`, `overtime_max_round`, `config_full_score`, `config_ot`, `config_streamer`, `config_knife_round`, `config_switch_auto`, `config_auto_change_password`, `config_password`, `config_heatmap`, `config_authkey`, `enable`, `map_selection_mode`, `ingame_enable`, `current_map`, `force_zoom_match`, `identifier_id`, `startdate`, `auto_start`, `auto_start_time`, `created_at`, `updated_at`) VALUES ({id}, {server_ip}, {server_id} ,{season_id}, {team_a}, {team_a_flag}, {team_a_name}, {team_b}, {team_b_flag}, {team_b_name}, {status}, {is_paused}, {score_a}, {score_b}, {max_round}, {rules}, {overtime_startmoney}, {overtime_max_round}, {config_full_score}, {config_ot}, {config_streamer}, {config_knife_round}, {config_switch_auto}, {config_auto_change_password}, {config_password}, {config_heatmap}, {config_authkey}, {enable}, {map_selection_mode}, {ingame_enable}, {current_map}, {force_zoom_match}, {identifier_id}, {startdate}, {auto_start}, {auto_start_time}, {created_at}, {updated_at})";
    const authkey = md5(md5(Math.random() + new Date().getTime() + match.teams[0].name + match.teams[1].name));
    query = query.replace(`{id}`, null)
        .replace(`{server_ip}`, `''`)
        .replace(`{server_id}`, null)
        .replace(`{season_id}`, match.internalTournament.id)
        .replace(`{team_a}`, null)
        .replace(`{team_a_flag}`, `'${match.teams[0].flag}'`)
        .replace(`{team_a_name}`, `'${match.teams[0].name}'`)
        .replace(`{team_b}`, null)
        .replace(`{team_b_flag}`, `'${match.teams[1].flag}'`)
        .replace(`{team_b_name}`, `'${match.teams[1].name}'`)
        .replace(`{status}`, 0)
        .replace(`{is_paused}`, 0)
        .replace(`{score_a}`, 0)
        .replace(`{score_b}`, 0)
        .replace(`{max_round}`, match.config.max_round)
        .replace(`{rules}`, `'${match.config.rules}'`)
        .replace(`{overtime_startmoney}`, match.config.ot_money)
        .replace(`{overtime_max_round}`, match.config.ot_max_round)
        .replace(`{config_full_score}`, 0)
        .replace(`{config_ot}`, match.config.ot_enable)
        .replace(`{config_streamer}`, match.config.production_ready)
        .replace(`{config_knife_round}`, match.config.knife_round)
        .replace(`{config_switch_auto}`, null)
        .replace(`{config_auto_change_password}`, null)
        .replace(`{config_password}`, `'${match.config.password}'`)
        .replace(`{config_heatmap}`, null)
        .replace(`{config_authkey}`, `'${authkey}'`)
        .replace(`{enable}`, 0)
        .replace(`{map_selection_mode}`, `'normal'`)
        .replace(`{ingame_enable}`, null)
        .replace(`{current_map}`, null)
        .replace(`{force_zoom_match}`, null)
        .replace(`{identifier_id}`, null)
        .replace(`{startdate}`, null)
        .replace(`{auto_start}`, 0)
        .replace(`{auto_start_time}`, null)
        .replace(`{created_at}`, `NOW()`)
        .replace(`{updated_at}`, `NOW()`);
    return query;
}

function mapQueryBuilder(matchId) {
    // eslint-disable-next-line max-len, no-template-curly-in-string, quotes
    let query = "INSERT INTO `maps`(`id`, `match_id`, `map_name`, `score_1`, `score_2`, `current_side`, `status`, `maps_for`, `nb_ot`, `identifier_id`, `tv_record_file`, `created_at`, `updated_at`) VALUES ({id}, {match_id}, {map_name}, {score_1}, {score_2}, {current_side}, {status}, {maps_for}, {nb_ot}, {identifier_id}, {tv_record_file}, {created_at}, {updated_at})";
    query = query.replace(`{id}`, null)
        .replace(`{match_id}`, matchId)
        .replace(`{map_name}`, `'tba'`)
        .replace(`{score_1}`, 0)
        .replace(`{score_2}`, 0)
        .replace(`{current_side}`, `'ct'`)
        .replace(`{status}`, 0)
        .replace(`{maps_for}`, `'default'`)
        .replace(`{nb_ot}`, 0)
        .replace(`{identifier_id}`, null)
        .replace(`{tv_record_file}`, null)
        .replace(`{created_at}`, `NOW()`)
        .replace(`{updated_at}`, `NOW()`);
    return query;
}

events.on(`hltvMatchesUpdate`, async hltvMatches => {
    logger.info(`Starting to check the eBot database`);

    const uniqueTournamentIds = Array.from(new Set(hltvMatches.map(match => match.internalTournament.id))).join(`,`);
    const query = `SELECT id, season_id, team_a_name as teamA, team_b_name as teamB FROM matchs WHERE status = 0 AND season_id IN (${uniqueTournamentIds})`; // eslint-disable-line max-len
    const [ebotMatches] = await database.query(query);

    for await (const hltvMatch of hltvMatches) {
        const foundMatch = findMatch(hltvMatch, ebotMatches);

        if (!foundMatch) {
            const matchQuery = matchQueryBuilder(hltvMatch);
            const [dbMatch] = await database.query(matchQuery);

            const mapQuery = mapQueryBuilder(dbMatch.insertId);
            const [dbMap] = await database.query(mapQuery);
            await database.query(`UPDATE \`matchs\` SET \`current_map\` = ${dbMap.insertId} WHERE id = ${dbMatch.insertId}`);

            logger.info(`Created a new match based on an external match (ID: ${dbMatch.insertId}, External ID: ${hltvMatch.id})`);
        } else {
            logger.info(`Skipped a match with the external ID ${hltvMatch.id} (Distance: ${foundMatch[0]})`);
        }
    }
});