# Cricket Hub API research

Verified on 2026-09-02 from the provider documentation at https://cricketdata.org/how-to-use-cricket-data-api.aspx.

CricketData (formerly CricAPI) documents a free signup API and the current matches endpoint:
`https://api.cricapi.com/v1/currentMatches?apikey=[your api key]&offset=0`

The documented current-match response includes `status`, `data`, and `info`. Each match can include `id`, `name`, `matchType`, `score` (innings with team, inning, runs, wickets, overs), `status`, `venue`, `date`, `dateTimeGMT`, `teams`, `series_id`, and `fantasyEnabled`. The provider states that current matches are matches with a toss winner but no match winner.

Implementation decision: keep the API key server-side in an environment variable, expose a typed tRPC `cricket.liveMatches` query, and let the Cricket Hub page refetch it every 30 seconds. If no key is configured or the provider is unavailable, render a clear setup/fallback state rather than fabricating scores.
