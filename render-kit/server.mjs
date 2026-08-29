import express from "express";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const PORT = Number(process.env.RENDER_KIT_PORT || 8941);

// Every tool here echoes its arguments straight back. The tool call exists so the
// component shows up in the transcript carrying its data; the client keys off the
// tool name and draws it. Nothing is computed server side.
const echo = (payload) => ({
  content: [{ type: "text", text: JSON.stringify(payload) }],
});

const option = z.object({
  id: z.string().min(1),
  primary: z.string().min(1),
  secondary: z.string().optional(),
  tertiary: z.string().optional(),
  value: z.string().optional(),
  valueLabel: z.string().optional(),
  meta: z.string().optional(),
  badges: z.array(z.string()).optional(),
});

const endpoint = z.object({
  code: z.string().min(1).describe("Short code, e.g. an airport or station code."),
  place: z.string().optional().describe("Human name of the place."),
  time: z.string().optional().describe("Time at this end, already formatted."),
  detail: z.string().optional().describe("Terminal, gate, platform, anything secondary."),
});

const endpoints = z.object({ from: endpoint, to: endpoint });

const tableRow = z.object({
  id: z.string().min(1),
  cells: z.array(z.string()).describe("One value per column, in column order."),
  status: z
    .string()
    .optional()
    .describe("Groups the row under a filter chip, e.g. an issue state or a task stage."),
  href: z
    .string()
    .url()
    .optional()
    .describe(
      "Where this row lives. Supply it whenever the record has a canonical page — an issue, a pull request, a document — and the row becomes a link to it.",
    ),
});

const field = z.object({
  label: z.string().min(1),
  value: z.string(),
});

function buildServer() {
  const server = new McpServer(
    { name: "render-kit", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.registerTool(
    "render_options",
    {
      title: "Render a pickable list",
      description:
        "Draw a list the user can pick from. Use this whenever you have candidate items to offer instead of describing them in prose. The user's choice arrives back as an ordinary message.",
      inputSchema: {
        title: z.string().min(1).describe("Heading above the list."),
        options: z.array(option).min(1).describe("Items to choose between."),
      },
    },
    async (args) => echo({ kind: "options", ...args }),
  );

  server.registerTool(
    "render_list",
    {
      title: "Render a read-only list",
      description:
        "Draw a list for reading, not picking. Use when the user asked to see things rather than choose between them.",
      inputSchema: {
        title: z.string().min(1),
        options: z.array(option).min(1),
      },
    },
    async (args) => echo({ kind: "list", ...args }),
  );

  server.registerTool(
    "render_detail",
    {
      title: "Render a detail card",
      description:
        "Draw one record in full: a heading, labelled fields, and optional body text.",
      inputSchema: {
        title: z.string().min(1),
        subtitle: z.string().optional(),
        fields: z.array(field).default([]),
        body: z.string().optional(),
        badges: z.array(z.string()).optional(),
        variant: z
          .enum(["card", "ticket"])
          .default("card")
          .describe(
            "Use 'ticket' when the record is a journey between two places: a flight, a train, a shipment, a transfer. Supply `endpoints` with it.",
          ),
        endpoints: endpoints
          .optional()
          .describe("Required by the ticket variant. The two ends of the journey."),
      },
    },
    async (args) => echo({ kind: "detail", ...args }),
  );

  server.registerTool(
    "render_table",
    {
      title: "Render a filterable table",
      description:
        "Draw rows across several columns, with chips along the top to filter by status. Use this when the records have more than one attribute worth comparing side by side and the user wants to scan rather than pick one.",
      inputSchema: {
        title: z.string().min(1),
        columns: z
          .array(z.string())
          .min(2)
          .max(5)
          .describe(
            "Column headings, in order. Four or five at most — the table is read in a narrow column, and more than that truncates every cell. Drop the attributes nobody scans for rather than squeezing them all in.",
          ),
        rows: z.array(tableRow).min(1),
      },
    },
    async (args) => {
      const bad = args.rows.filter((row) => row.cells.length !== args.columns.length);
      if (bad.length > 0) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                `Every row needs exactly one cell per column. ${args.columns.length} columns were ` +
                `declared, but ${bad.length} row(s) did not match, starting with id "${bad[0].id}" ` +
                `which has ${bad[0].cells.length}. Pad short rows with an empty string.`,
            },
          ],
        };
      }
      return echo({ kind: "table", ...args });
    },
  );

  server.registerTool(
    "render_confirm",
    {
      title: "Render a confirmation gate",
      description:
        "Draw a confirmation card before doing something the user cannot undo. State plainly what will happen. Wait for the reply before acting.",
      inputSchema: {
        title: z.string().min(1),
        summary: z.string().min(1).describe("What is about to happen."),
        consequence: z
          .string()
          .min(1)
          .describe("Why it cannot be undone, in one sentence."),
        confirmLabel: z.string().default("Confirm"),
        fields: z.array(field).default([]),
      },
    },
    async (args) => echo({ kind: "confirm", ...args }),
  );

  return server;
}

const app = express();
app.use(express.json({ limit: "4mb" }));

app.get("/", (_req, res) => {
  res.type("text/plain").send(`render-kit mcp on :${PORT}/mcp`);
});

app.post("/mcp", async (req, res) => {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on("close", () => {
    transport.close();
    server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("mcp request failed", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`render-kit mcp listening on http://localhost:${PORT}/mcp`);
});
