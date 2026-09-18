# Decision log

Design changes and the reasons for them. This is what gets shown when a judge
asks why something is the way it is.

---

## D-001 — Not Hyperledger Fabric

**Decision.** A signed, hash-chained append-only log with a Merkle history tree
and multi-authority timestamp anchoring. Not a three-node permissioned blockchain.

**Why.** Fabric's recommended production ordering service, Raft, is crash fault
tolerant and not Byzantine — it assumes nodes fail by stopping, not by lying. In a
three-node Raft ordering service the quorum is two, and two of the three would be
arms of the executive. Fabric's own BFT orderer follows n ≥ 3f+1, so four
independently controlled nodes are the minimum to tolerate one malicious party.
"To forge the record you'd have to compromise a majority" is arithmetically true
and rhetorically misleading at three nodes.

Every participating organisation would also have to run certificate-authority
infrastructure and key management — a burden landing hardest on a court registry,
which has the least IT capacity and no located statutory authority to run
consensus infrastructure.

India's own eSakshya specified hash plus immutable storage, timestamping and
e-signing — explicitly not a ledger. That is dispositive of what is adoptable.

**Consequence.** The UI says *Hash-Chained Evidence Log*, never *blockchain*.
There are no blocks, nodes, miners or consensus anywhere in the product.

---

## D-002 — The interface never claims an instant of creation

**Decision.** `claimed_time` is stored and always rendered as *untrusted device
clock*. The trusted claim is an interval: `[previous anchor, this anchor]`.

**Why.** A phone in aeroplane mode cannot know the time and its clock can be set
wrong deliberately. What the construction proves is exactly two things: an anchor
proves the hash existed no later than the anchor time, and the local hash chain
fixes the relative order of offline captures. The residual backdating window is
precisely the capture-to-anchor gap — a physical limit, not an engineering gap,
which is why anchor cadence is the only lever the design has on it.

**Consequence.** Nowhere in the product does a bare timestamp appear without its
qualifier. Unanchored records read *not yet anchored — time unproven*, never a
claimed time presented as fact.

---

## D-003 — Two timestamp authorities, not one

**Decision.** Every anchor is submitted to two independent authorities in
different trust domains. One available authority degrades the anchor; it does not
break it.

**Why.** Our own argument against a single database administrator was that one
party could rewrite history. Anchoring to a single authority would reintroduce a
single trusted party at another layer. The two trusts are not the same shape — an
administrator reads plaintext and alters any field, while a timestamp authority
receives a hash and can lie about exactly one thing, the time — but a second
independent authority is what makes that lie detectable, and a reviewer will ask.

---

## D-004 — A referral tier, never a probability

**Decision.** The sensor adapter emits a non-probabilistic referral tier.

**Why.** At a platform prevalence around 1 in 10,000, reaching even a 50% positive
predictive value needs roughly four stages of genuinely independent evidence, and
the independence assumption fails: one physical event perturbs several signals
through overlapping causal pathways. Conditionally dependent tests make an
independence-assuming estimator overstate combined accuracy. A tier is also
legally sufficient — s.43 asks for belief, not a calibrated posterior — and it is
the shape the WCO SAFE Framework and India's own customs risk-management system
already use.

**Consequence.** No confidence score, anomaly percentage or probability appears
anywhere. The sentence never to say is *73% anomaly at Coach S4*.

---

## D-005 — The field test is presumptive, on the face of every record

**Decision.** `epistemic_status` is a fixed string on every field-test payload,
result status is limited to presumptive positive / presumptive negative /
inconclusive, and observed colour is a dropdown.

**Why.** The NCB's own handbook says the field test "is only indicative … and is
not admissible as evidence in the court". A Bombay High Court judge granted bail
because "there are no documented set standards as to which substance upon testing
with reagent/s would produce, which colour", so that all of field testing is left
to officer perception — which he called arbitrary. Read as a requirements
document, that judgment specifies exactly the fields this record carries.

**Consequence.** The words *confirmed*, *identified* and *drug detected* appear
nowhere in the product except in the list of words the product refuses to print.

---

## D-006 — Expired lots are recorded, not blocked

**Decision.** An expired reagent lot produces a prominent warning that is carried
into the signed payload and printed on the rendered document. It does not prevent
the record being created.

**Why.** Refusing to record what actually happened would be worse than recording
it with its defect visible. The point of the system is to make the basis of an
action legible, including when that basis is weak.

---

## D-007 — Part B of the Section 63 certificate is never auto-signed

**Decision.** Part A is auto-filled from what the system holds. Part B is left
blank.

**Why.** Section 63(4) requires a certificate signed by the person in charge *and*
an expert — conjunctive, where the old Section 65B required one signatory. Who may
sign Part B is formally open: the favourable authority is real, recent and
procedurally thin, and the contrary High Court ruling was not overruled on the
merits. The system is not the expert and does not pretend to be one.

**Also.** SHA-256 is always selected. The Schedule still offers MD5 as a checkbox;
NIST SP 800-86 bars it, so it is never ticked.

---

## D-008 — Status is derived, never stored

**Decision.** Case stage, handoff state and anchor state are computed from the
records that exist, not held as independent fields.

**Why.** It makes impossible states impossible. A GRP receipt cannot exist without
an RPF transfer record because the receipt route refuses to create one, and no
stored status field can drift away from what the log actually contains.

---

## D-009 — Signing happens on the device, before anything is transmitted

**Decision.** Records are signed and chained at capture, then queued. Reaching the
server is a separate step.

**Why.** Signing at the server proves only that the server received something.
Only edge signing closes the window in which a compromised intermediary could
substitute a reading before it was sealed.

---

## D-010 — This build does not claim TEE or StrongBox

**Decision.** The device page reports the key security level actually in use
("Software") alongside the production target ("TEE" or "StrongBox"), rather than
asserting the target.

**Why.** A web prototype has no secure element. Android key attestation produces a
hardware-rooted certificate chain generated inside secure hardware; a self-reported
security level is a claim made by the very software whose integrity is in
question. Whether a procurement-tier handheld exposes StrongBox or only a TEE
materially changes the claim, and is a week-zero question answered with a real
handset — not an assumption.

---

## D-011 — Local JSON storage instead of PostgreSQL, disclosed as such

**Decision.** The evidence store is a JSON file behind a repository module.

**Why.** The prototype has to run with `npm run dev` and nothing else installed.
The whole application talks to one module, so connecting PostgreSQL is a change to
that module and nothing above it.

**Consequence.** The interface says "local prototype storage", never "database".
The append-only property is enforced in the data-access layer; the production
insert-only trigger would be defence in depth, since the chain is what proves
tampering.

---

## D-012 — The tamper demonstration edits real stored data

**Decision.** "Simulate tampering" rewrites a stored record's payload *and*
recomputes its payload hash, exactly as an administrator covering their tracks
would. It is not an animation.

**Why.** The signature was made over the original payload hash, so it stops
verifying; the record's identity hash changes, so every record after it on that
device loses its link; and the anchored tree head can no longer be reproduced. All
four failures are real, and the verifier finds them by re-walking the chain.

**Consequence.** `Restore` replaces the altered records with the originals kept at
tamper time. Seeded alterations are marked `source: "seed"` and survive a restore,
so the failure state stays demonstrable; `Reset demo` returns everything.

---

## D-013 — The dashboard reports per-case verdicts

**Decision.** The dashboard hero shows how many cases verify and names the broken
one, rather than a single global verdict.

**Why.** One altered record makes the whole log fail verification — correctly. A
single global red light would be honest but useless: it would not say which case
is affected. The per-case verdict is honest *and* actionable, and it means the
seeded broken case demonstrates detection working the moment the app opens.
