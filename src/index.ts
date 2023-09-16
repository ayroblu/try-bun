import { convertText, safeResolve } from "./source-map-manager";

const [filename] = process.argv.slice(2);

if (!filename) {
  console.log("pass a filename argument");
  process.exit();
}

const profileJson = Bun.file(filename);

(async () => {
  const { traceEvents, metadata } = await profileJson.json();
  console.log("total events", traceEvents.length);
  const lines = [];
  for (let i = 0; i < traceEvents.length; ++i) {
    if (i % 1000 === 0) {
      console.log("count", i);
    }
    const event = traceEvents[i];

    if (event.args.data?.url) {
      handleSourceItem(event.args.data);
    } else if (event.args.data?.cpuProfile?.nodes) {
      const nodes = event.args.data?.cpuProfile?.nodes;
      for (const node of nodes) {
        if (node.callFrame?.url) {
          handleSourceItem(node.callFrame);
        }
      }
    }
    lines.push(`  ${JSON.stringify(event)}`);
  }
  const result = `{"traceEvents": [
${lines.join(",\n")}
],
"metadata": ${JSON.stringify(metadata, null, 2)}}`;
  await Bun.write(filename, result);
})();

async function handleSourceItem(item: {
  url: string;
  lineNumber: number;
  columnNumber: number;
}) {
  const { url, columnNumber, lineNumber } = item;
  if (!url.includes("abs.twimg.com")) {
    return;
  }
  const result = await safeResolve(url, lineNumber + 1, columnNumber + 1);
  if (!result.success) {
    console.error(
      "failed to resolve",
      url,
      lineNumber,
      columnNumber,
      result.error,
    );
  } else {
    const { pos } = result.data;
    const { line: newLine, column: newColumn, source } = pos;
    item.url = source;
    item.columnNumber = newColumn - 1;
    item.lineNumber = newLine - 1;
  }
}
