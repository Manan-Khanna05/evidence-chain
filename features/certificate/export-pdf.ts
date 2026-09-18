"use client";

import type { Certificate, ClientStore } from "@/lib/domain/types";
import { fmtDate, fmtDateTime, fmtInterval, fmtTime } from "@/lib/format";

/**
 * Generates the Section 63 Schedule certificate as a real PDF file and hands it
 * to the browser. jsPDF is imported dynamically so it never enters the initial
 * bundle.
 */
export async function exportCertificatePdf(certificate: Certificate, store: ClientStore) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const kase = store.cases.find((c) => c.case_ref === certificate.case_ref);
  const records = store.records.filter((r) => certificate.record_ids.includes(r.record_id));
  const device = store.devices.find((d) => d.device_id === records[0]?.device_id);
  const signatory = store.officers.find(
    (o) => o.officer_id === certificate.part_a_signatory_officer_id,
  );
  const anchor = store.anchors.find((a) => a.anchor_id === certificate.anchor_id) ?? null;

  const M = 48;
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const RIGHT = W - M;
  let y = M;

  const ensure = (needed: number) => {
    if (y + needed > H - M) {
      doc.addPage();
      y = M;
    }
  };

  const text = (
    s: string,
    x: number,
    size = 9.5,
    style: "normal" | "bold" | "italic" = "normal",
    colour: [number, number, number] = [17, 24, 39],
  ) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...colour);
    doc.text(s, x, y);
  };

  const rule = (weight = 0.6, colour: [number, number, number] = [17, 24, 39]) => {
    doc.setDrawColor(...colour);
    doc.setLineWidth(weight);
    doc.line(M, y, RIGHT, y);
  };

  const sectionTitle = (label: string) => {
    ensure(34);
    y += 10;
    text(label.toUpperCase(), M, 9, "bold");
    y += 5;
    rule(0.9);
    y += 14;
  };

  const pair = (label: string, value: string, col: 0 | 1 = 0, mono = false) => {
    const colX = col === 0 ? M : M + (RIGHT - M) / 2;
    const width = (RIGHT - M) / 2 - 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text(label.toUpperCase(), colX, y);
    doc.setFont(mono ? "courier" : "helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(17, 24, 39);
    const lines = doc.splitTextToSize(value || "—", width) as string[];
    doc.text(lines, colX, y + 11);
    return 11 + lines.length * 11;
  };

  const pairRow = (
    left: [string, string, boolean?],
    right?: [string, string, boolean?],
  ) => {
    ensure(40);
    const h1 = pair(left[0], left[1], 0, left[2]);
    const h2 = right ? pair(right[0], right[1], 1, right[2]) : 0;
    y += Math.max(h1, h2) + 8;
  };

  /* ------------------------------------------------------------ masthead */
  text("EVIDENCE CHAIN", M, 8.5, "bold", [107, 114, 128]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(certificate.certificate_id, RIGHT, y, { align: "right" });
  y += 18;
  text("Certificate under Section 63(4)(c)", M, 16, "bold");
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(fmtDateTime(certificate.generated_at), RIGHT, y, { align: "right" });
  y += 15;
  text("The Schedule · Bharatiya Sakshya Adhiniyam, 2023", M, 10, "normal", [55, 65, 81]);
  y += 10;
  rule(1.4);
  y += 6;

  /* -------------------------------------------------------------- part a */
  sectionTitle(
    "Part A — to be filled by the person in charge of the computer or communication device",
  );
  pairRow(["Case reference", certificate.case_ref, true], ["Place", kase?.place ?? "—"]);
  pairRow(
    ["Person in charge", signatory ? signatory.name : certificate.part_a_signatory_officer_id],
    ["Designation / force", signatory ? `${signatory.rank}, ${signatory.force}` : "—"],
  );

  y += 2;
  text("DEVICE PARTICULARS", M, 7.5, "bold", [107, 114, 128]);
  y += 14;
  pairRow(["Device type", device?.device_type ?? "—"], ["Make", device?.make ?? "—"]);
  pairRow(["Model", device?.model ?? "—"], ["Serial number", device?.serial ?? "—", true]);
  pairRow(
    [device?.hardware_identifier_kind ?? "IMEI / UIN / UID / MAC", device?.hardware_identifier ?? "—", true],
    ["Records certified", String(certificate.record_ids.length)],
  );

  /* ---------------------------------------------------------------- hash */
  ensure(120);
  y += 4;
  const boxTop = y;
  doc.setDrawColor(17, 24, 39);
  doc.setLineWidth(1.1);
  text("I state that the HASH value/s of the electronic/digital record/s is", M + 12, 9.5);
  y += 16;
  doc.setFont("courier", "bold");
  doc.setFontSize(8.5);
  const hashLines = doc.splitTextToSize(certificate.hash, RIGHT - M - 24) as string[];
  doc.text(hashLines, M + 12, y);
  y += hashLines.length * 11 + 6;
  text("obtained through the following algorithm:—", M + 12, 9.5);
  y += 15;
  const boxes: [string, boolean][] = [
    ["SHA1", false],
    ["SHA256", true],
    ["MD5", false],
    ["Other", false],
  ];
  let bx = M + 12;
  for (const [label, checked] of boxes) {
    doc.setLineWidth(0.7);
    doc.rect(bx, y - 7, 8, 8);
    if (checked) {
      doc.setFillColor(17, 24, 39);
      doc.rect(bx, y - 7, 8, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text("X", bx + 2, y - 1);
    }
    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", checked ? "bold" : "normal");
    doc.setFontSize(9);
    doc.text(label, bx + 12, y);
    bx += doc.getTextWidth(label) + 34;
  }
  y += 14;
  text("(Hash report to be enclosed with the certificate.)", M + 12, 7.5, "italic", [75, 85, 99]);
  y += 10;
  doc.setDrawColor(17, 24, 39);
  doc.setLineWidth(1.1);
  doc.rect(M, boxTop - 12, RIGHT - M, y - boxTop + 14);
  y += 18;

  /* ------------------------------------------------------------- records */
  ensure(60);
  text("RECORDS COVERED BY THIS HASH", M, 7.5, "bold", [107, 114, 128]);
  y += 12;
  const cols = [M, M + 108, M + 220, M + 262, M + 420];
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(17, 24, 39);
  ["RECORD ID", "TYPE", "SEQ", "PAYLOAD HASH", "CLAIMED"].forEach((h, i) =>
    doc.text(h, cols[i], y),
  );
  y += 4;
  doc.setDrawColor(156, 163, 175);
  doc.setLineWidth(0.5);
  doc.line(M, y, RIGHT, y);
  y += 12;

  const TYPE_TEXT: Record<string, string> = {
    trigger: "s.43 trigger",
    field_test: "Field test",
    handoff_transfer: "Handoff transfer",
    handoff_receipt: "Handoff receipt",
  };
  for (const r of records) {
    ensure(20);
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.setTextColor(17, 24, 39);
    doc.text(r.record_id, cols[0], y);
    doc.setFont("helvetica", "normal");
    doc.text(TYPE_TEXT[r.type] ?? r.type, cols[1], y);
    doc.setFont("courier", "normal");
    doc.text(`#${r.seq}`, cols[2], y);
    doc.text(`${r.payload_hash.slice(0, 22)}…`, cols[3], y);
    doc.text(fmtTime(r.claimed_time), cols[4], y);
    y += 6;
    doc.setDrawColor(229, 231, 235);
    doc.line(M, y, RIGHT, y);
    y += 12;
  }

  /* --------------------------------------------------------- integrity */
  y += 4;
  text("INTEGRITY CONTEXT", M, 7.5, "bold", [107, 114, 128]);
  y += 14;
  pairRow(["Merkle tree head", certificate.tree_head, true], ["Anchor", certificate.anchor_id ?? "Not anchored", true]);
  pairRow(
    [
      "Trusted interval",
      anchor ? fmtInterval(anchor.interval_start, anchor.interval_end) : "—",
    ],
    [
      "Timestamp authorities",
      anchor
        ? anchor.tsa
            .map((t) => `${t.tsa_name}: ${t.status === "verified" ? "verified" : "unavailable"}`)
            .join("; ")
        : "—",
    ],
  );
  ensure(30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  doc.text(
    doc.splitTextToSize(
      "The device clock recorded against each record is untrusted and is stated as claimed time only. The interval above is the bound established by the timestamp anchors.",
      RIGHT - M,
    ) as string[],
    M,
    y,
  );
  y += 24;

  ensure(50);
  doc.setDrawColor(17, 24, 39);
  doc.setLineWidth(0.6);
  doc.line(M, y + 16, M + 200, y + 16);
  doc.line(M + 260, y + 16, M + 400, y + 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);
  doc.text(fmtDate(certificate.generated_at), M + 260, y + 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text("SIGNATURE", M, y + 27);
  doc.text("DATE", M + 260, y + 27);
  y += 46;

  /* -------------------------------------------------------------- part b */
  sectionTitle("Part B — to be filled by the expert");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(17, 24, 39);
  doc.text("I state that the HASH value/s of the electronic/digital record/s is", M, y);
  doc.setDrawColor(17, 24, 39);
  doc.line(M + 300, y + 2, RIGHT, y + 2);
  y += 16;
  doc.text("obtained through the following algorithm:—", M, y);
  y += 16;
  bx = M;
  for (const [label] of boxes) {
    doc.setLineWidth(0.7);
    doc.rect(bx, y - 7, 8, 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(label, bx + 12, y);
    bx += doc.getTextWidth(label) + 34;
  }
  y += 20;

  ensure(64);
  doc.setDrawColor(156, 163, 175);
  doc.setLineWidth(0.7);
  doc.setLineDashPattern([3, 3], 0);
  doc.rect(M, y - 6, RIGHT - M, 52);
  doc.setLineDashPattern([], 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  doc.text("DELIBERATELY LEFT BLANK", M + 10, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.text(
    doc.splitTextToSize(
      "This system does not sign as the expert. Section 63(4) requires a certificate signed by the person in charge and an expert; who may sign Part B was expressly left open by the Supreme Court, so this part is completed by a Section 79A-notified Examiner of Electronic Evidence or another qualified expert, not by the software.",
      RIGHT - M - 20,
    ) as string[],
    M + 10,
    y + 20,
  );
  y += 62;

  ensure(48);
  doc.setDrawColor(17, 24, 39);
  doc.setLineWidth(0.6);
  const thirds = (RIGHT - M - 40) / 3;
  [0, 1, 2].forEach((i) => doc.line(M + i * (thirds + 20), y + 16, M + i * (thirds + 20) + thirds, y + 16));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  ["NAME OF EXPERT", "SIGNATURE", "DATE"].forEach((l, i) =>
    doc.text(l, M + i * (thirds + 20), y + 27),
  );

  /* -------------------------------------------------------------- footer */
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(107, 114, 128);
    doc.text(
      "Prototype-generated certificate · synthetic demo data · hash values are genuine SHA-256 over the records held in this build; signatures were produced with a software key, not a hardware-backed key.",
      M,
      H - 30,
      { maxWidth: RIGHT - M },
    );
    doc.text(`Page ${p} of ${pages}`, RIGHT, H - 18, { align: "right" });
  }

  doc.save(`${certificate.certificate_id}_${certificate.case_ref}.pdf`);
}
