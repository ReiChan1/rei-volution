import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function wrapText(
  text: string,
  font: import("pdf-lib").PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (paragraph.trim() === "") {
      lines.push("");
      continue;
    }
    const words = paragraph.split(" ");
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, fontSize) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const { id } = await params;

  const report = await prisma.report.findFirst({
    where: { id, userId },
    include: { task: { select: { title: true } }, user: { select: { firstName: true, lastName: true } } },
  });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612; // US Letter, points
  const pageHeight = 792;
  const margin = 56;
  const maxWidth = pageWidth - margin * 2;
  const primary = rgb(0.655, 0.545, 0.859); // #A78BDB
  const muted = rgb(0.545, 0.541, 0.639);
  const foreground = rgb(0.082, 0.082, 0.122);

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  function newPageIfNeeded(lineHeight: number) {
    if (y < margin + lineHeight) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  }

  // Header brand
  page.drawText("Rei-volution", { x: margin, y, size: 11, font: boldFont, color: primary });
  page.drawText("Report", { x: pageWidth - margin - font.widthOfTextAtSize("Report", 11), y, size: 11, font, color: muted });
  y -= 28;

  // Title
  const titleLines = wrapText(report.title, boldFont, 20, maxWidth);
  for (const line of titleLines) {
    newPageIfNeeded(26);
    page.drawText(line, { x: margin, y, size: 20, font: boldFont, color: foreground });
    y -= 26;
  }
  y -= 4;

  // Meta line
  const dateStr = report.reportDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const author = `${report.user.firstName} ${report.user.lastName}`;
  const metaLine = report.task ? `${dateStr} · ${author} · Linked task: ${report.task.title}` : `${dateStr} · ${author}`;
  page.drawText(metaLine, { x: margin, y, size: 10, font, color: muted });
  y -= 24;

  // Divider
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 1,
    color: rgb(0.914, 0.871, 0.961),
  });
  y -= 24;

  // Body content
  const bodyLines = wrapText(report.content, font, 11.5, maxWidth);
  for (const line of bodyLines) {
    newPageIfNeeded(18);
    page.drawText(line, { x: margin, y, size: 11.5, font, color: foreground });
    y -= 18;
  }

  const pdfBytes = await doc.save();
  const filename = `${report.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "report"}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
