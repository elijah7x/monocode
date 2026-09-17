// Scratch harness: render real persisted sessions and report what stays
// visible. Not part of the product suite — deleted before commit.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "vitest";
import type { Block } from "../lib/session";
import { AgentTranscript } from "./AgentTranscript";
import {
  foldableWork,
  foldContentCounts,
  foldedBlocks,
  groupTurnItems,
  groupTurns,
  isCollapsibleWork,
  isNarrationItem,
  isProseBlock,
  isSettledFoldMember,
  settledFold,
  workSummaryLine,
} from "./transcriptActivity";

const DIR = "/tmp/mc-real";
const CSS = "/Users/elijah/Universe/Oort/monocode/dist/assets/index-v-tM3dW6.css";

function count(markup: string, needle: string): number {
  return markup.split(needle).length - 1;
}

function snapshot(id: string, markup: string) {
  writeFileSync(
    `${DIR}/${id}.after.html`,
    `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="file://${CSS}"><style>body{margin:0;background:#1b1b1e;font-family:ui-sans-serif,system-ui}</style></head><body><div class="text-content" style="max-width:860px;margin:0 auto;padding:24px 0">${markup}</div></body></html>`,
  );
}

function report(id: string, blocks: Block[]) {
  const markup = renderToStaticMarkup(
    createElement(AgentTranscript, { blocks, busy: false }),
  );
  const live = renderToStaticMarkup(
    createElement(AgentTranscript, { blocks, busy: true }),
  );
  const interjections = blocks.filter((b) => b.interjection).length;
  const statusRows = blocks.filter(
    (b) => b.role === "system" && !b.interjection,
  ).length;
  const subagents = blocks.filter((b) => b.agentRun).length;
  const prose = blocks.filter(
    (b) => b.role === "assistant" && b.text.trim(),
  ).length;
  const users = blocks.filter((b) => b.role === "user").length;
  // The settled fold defers earlier messages and routine exchanges; the
  // fold line counts them. stored prose = answers + earlier + replies.
  let earlier = 0;
  let inputs = 0;
  for (const turn of groupTurns(blocks)) {
    const items = groupTurnItems(
      turn.filter((b) => !b.orchestration),
      { settled: true },
    );
    const fold = settledFold(items);
    if (!fold) continue;
    const counts = foldContentCounts(items, fold);
    earlier += counts.messages;
    inputs += counts.inputs;
  }
  console.log(
    [
      `\n=== ${id.slice(0, 8)} (${blocks.length} blocks) ===`,
      `stored:      prose=${prose} users=${users} subagents=${subagents} interjections=${interjections} status=${statusRows}`,
      `folded-away: earlier=${earlier} advisor-inputs=${inputs} — answers + earlier should equal prose`,
      `settled-dom: exchanges=${count(markup, "data-exchange")} openExchanges=${count(markup, 'data-exchange="true"><button type="button" aria-expanded="true"')} subagentPanels=${count(markup, 'aria-label="Subagent:')} answers=${count(markup, "data-selectable-agent-response")} statusPres=${count(markup, 'px-4 py-2 text-content/50')} foldButtons=${count(markup, "Show the steps")}`,
      `live-dom:    exchanges=${count(live, "data-exchange")} subagentPanels=${count(live, 'aria-label="Subagent:')} answers=${count(live, "data-selectable-agent-response")}`,
      `markup bytes: ${markup.length}`,
    ].join("\n"),
  );
  snapshot(id, markup);
  writeFileSync(`${DIR}/${id}.live.html`, `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="file://${CSS}"><style>body{margin:0;background:#1b1b1e;font-family:ui-sans-serif,system-ui}</style></head><body><div class="text-content" style="max-width:860px;margin:0 auto;padding:24px 0">${live}</div></body></html>`);
}

function turnReport(id: string, blocks: Block[]) {
  const turns = groupTurns(blocks);
  console.log(`\n--- per-turn detail ${id.slice(0, 8)} ---`);
  turns.forEach((turn, ti) => {
    const items = groupTurnItems(
      turn.filter((b) => !b.orchestration),
      { settled: true },
    );
    const fold = settledFold(items);
    const folded = fold ? foldedBlocks(items, fold) : [];
    const visible = items
      .map((item, i) => {
        const insideFold =
          fold &&
          i >= fold.start &&
          i <= fold.end &&
          isSettledFoldMember(item);
        if (insideFold) {
          if (item.type === "exchange") return `[ex(${item.notes.length})]`;
          if (item.type === "block") return `[msg]`;
          return null;
        }
        if (item.type === "activity") {
          return `activity(${item.blocks.length})`;
        }
        if (item.type === "subagents") return `subagents(${item.blocks.length})`;
        if (item.type === "exchange")
          return `exchange(${item.notes.length}${item.reply ? "+reply" : ""})`;
        const b = item.block;
        if (b.role === "user") return "USER";
        if (b.interjection) return `divider(${b.interjection.customType})`;
        if (b.role === "system") return "status";
        if (isProseBlock(b)) return `prose`;
        return b.role;
      })
      .filter(Boolean);
    console.log(
      `turn ${ti}: visible=[${visible.join(", ")}]` +
        (fold
          ? ` | fold ${fold.start}..${fold.end} (${folded.length} blocks): "${workSummaryLine(folded)}"`
          : " | no fold"),
    );
  });
}

describe("real session rendering", () => {
  it("reports", () => {
    for (const file of readdirSync(DIR).filter((f) => f.endsWith(".json"))) {
      const blocks = JSON.parse(readFileSync(`${DIR}/${file}`, "utf8"));
      report(file, blocks as Block[]);
      turnReport(file, blocks as Block[]);
    }
  });
});
