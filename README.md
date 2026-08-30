# drawn

An agent connected to an MCP server usually answers with a wall of JSON or a
paragraph describing what it found. drawn makes it answer with interface.

Ask for flights and you get a list of fares you can click. Ask for open issues
and you get a filterable table where each row opens the issue on GitHub. Same
agent, same code, different connector.

## The idea

The usual way to build this is to write a renderer per integration: one for
Gmail, one for Linear, one for GitHub. That does not scale, and it means every
new MCP server needs a frontend release before it looks like anything.

drawn inverts it. There are five generic components, and the agent decides
which one fits what it just fetched:

- `render_options` for a set of things to choose between
- `render_detail` for the one that was chosen
- `render_table` for records you scan and compare
- `render_list` for a plain roll of items
- `render_confirm` for anything about to change the world

Our MCP server does not fetch anything. Its five tools take a typed payload and
hand it straight back. The value is in the schema, not the data. The agent is
the adapter: it reads whatever shape a real connector returned and normalises it
into one of the five, which is the part that used to be a frontend release.

So adding a connector adds a surface. Nothing in the UI knows what a flight is,
or an issue, and the table has never heard of GitHub.

## What is actually running

Three connectors on one agent:

- **flights**, a public MCP server, no auth
- **github**, the official server with a token
- **render-kit**, ours, the five components above

Beyond the rendering, the parts worth pointing at:

**Streaming.** Turns are read over SSE as they happen rather than polled for
completion. The first tool chip appears at about 2.4 seconds instead of the
roughly 35 the poll loop took.

**The sandbox.** When a question needs arithmetic the agent does not do the
arithmetic itself. It writes Python, runs it in the sandbox, and calls the
source tool from inside that script, so the derived column is computed rather
than guessed. Ask which flight is the best value per hour and the number in the
table came out of a real interpreter.

**The approval gate.** Anything that writes is held by the harness before it
runs. The UI renders the pause as a card with the actual arguments visible, and
approving or denying resumes the same turn. Deny and the tool never ran.

**Replay.** Sessions reload from the harness with their components intact,
including which approvals were allowed and which were refused.

## Running it

You need the TrueForge harness on `localhost:8790`, plus Node 20 or newer.

```
# the render kit
cd render-kit && npm install && node server.mjs

# the app
cd ui && npm install && npm run dev
```

Then register the agent, which is what points it at the three connectors:

```
curl -X PUT http://localhost:8790/api/v1/agents/<agent-id> \
  -H 'Content-Type: application/json' \
  -d "$(python3 -c "import json;print(json.dumps({'manifest':json.load(open('agent.json'))['manifest']}))")"
```

Keys live in `.env` and never in the repo. You want `OPENAI_API_KEY` for the
model, `GITHUB_TOKEN` for the GitHub connector, and `DAYTONA_API_KEY` if you
want the sandbox. The flights server needs nothing.

One gotcha worth saving you an hour: the Daytona key needs **Snapshots: write**,
not read. With read-only the harness reports it as a rejected API key, which is
a different problem and sends you looking in the wrong place.

## Qodo code review evidence

Every change went through a PR with Qodo reviewing it. Ten findings across five
PRs, all addressed rather than waved through, each with a reply on the thread.

| PR | What it was | Findings |
|----|-------------|----------|
| [#1](https://github.com/Gmin2/drawn/pull/1) | filterable table | 4 |
| [#2](https://github.com/Gmin2/drawn/pull/2) | sandbox and computed columns | 1 |
| [#3](https://github.com/Gmin2/drawn/pull/3) | replayed approvals | 0 |
| [#4](https://github.com/Gmin2/drawn/pull/4) | streaming | 3 |
| [#5](https://github.com/Gmin2/drawn/pull/5) | row links | 2 |

Three of those are worth reading rather than counting.

On **#2** it flagged that my sandbox example called `call_tool` without
awaiting it. I had watched that feature produce correct numbers and assumed the
example was fine. It was not: `call_tool` is `async def`, and the run only
worked because the agent quietly gave up on the documented pattern and fell
back to the CLI client. The output was right, the instruction was wrong, and
testing the output had hidden it.

On **#5** it caught that `z.string().url()` accepts any parseable scheme. Since
`href` is model-supplied, `javascript:` was reachable from tool output rather
than from our own code. Restricted to http and https.

On **#1** I kept a decision it questioned and said why on the thread. It read
the hidden-row animation as dead markup, but the rows collapse their grid track
instead of unmounting so the table settles rather than jumps. The fix there was
`aria-hidden` and `inert`, so the rows are gone for assistive tech while still
being able to animate, rather than removing the animation.

## Credits

Component design adapted from [Beautiful UI](https://www.beautifului.dev), MIT.
Built on [TrueForge](https://github.com/truefoundry/trueforge).
