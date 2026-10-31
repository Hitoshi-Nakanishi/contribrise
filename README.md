# Contribrise

**See your learning curve.**

Compare cumulative GitHub contributions from January 1. A small, local app for reflecting on the rhythm of practice, with English and Japanese interfaces. Activity is a trace of practice, not a measure of skill.

[日本語](README.ja.md)

## Run

Requires Python 3.10+, [GitHub CLI](https://cli.github.com/) signed in with `gh auth login`, and an internet connection. No Python packages, JavaScript dependencies, build step, or token entry in the app.

```sh
python app.py --open
```

On Windows, double-click `start.cmd`. The app runs at `http://127.0.0.1:8783`; use `--port` to select another port. If that port is occupied by another app, Contribrise selects an available one.

Enter up to five GitHub usernames, separated by commas or spaces, and choose a year. Hover or tap the chart for daily cumulative values. Click an account in the legend to hide its line. The language switch, usernames, and comparison links make returning to a view easy.

Choose **By year** to compare one user's years on the same month/day axis. Enter up to ten years as a list or range, such as `2022-2026`. Each year keeps its own calendar, including leap days; the current year's line stops at the latest available date. Missing dates show a dash in the tooltip.

Yearly comparisons automatically use a second axis when adjacent nonzero totals, sorted by size, have a ratio of at least five. The largest qualifying gap separates the groups: smaller totals use the left axis, larger totals use the right. Both axes start at zero, and the legend and tooltip identify the axis for every year. Similar totals share one axis. Axis assignment stays stable when hiding lines.

The background process stays available after closing the browser. To run with an explicit stop control, use `python app.py` in a terminal and press Ctrl+C when finished.

## Data and privacy

- Data comes directly from GitHub's GraphQL contribution calendar through your existing GitHub CLI login. Successful responses are cached in memory for five minutes.
- Contributions include qualifying commits and other GitHub activity, including private activity counts that GitHub exposes to the signed-in account. Counts can differ between viewers with different access.
- The app binds to loopback only. It is intended for local use, not deployment as a public web service with your GitHub credentials.
- Usernames and language are stored in your browser. Comparison usernames and the year also appear in the URL. Credentials are managed by GitHub CLI and are never sent to the browser or saved by Contribrise.
- No analytics, third-party scripts, database, or saved contribution history.

For GitHub's counting rules, see [Profile contributions reference](https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference).

## Source

`app.py` fetches data and serves `index.html`, `style.css`, and `app.js`. The chart uses native SVG. `start.cmd` is the optional Windows launcher.

```sh
python -m unittest
```

## License

[MIT](LICENSE)
