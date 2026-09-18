# The Seam, Not the Sensor: Building a Court-Admissible Evidence Chain for Narcotics Detection on Indian Railways

The framing is right and the aim is wrong. Building the software spine around a detection module rather than the module itself is the correct instinct. But the spine has been pointed at the wrong joint. The pitch imagines one officer who detects, confirms and closes a case. Indian law does not contain that officer.

The Railway Protection Force (RPF, the central force policing railway property) is empowered under the Narcotic Drugs and Psychotropic Substances Act, 1985 (NDPS) only under Sections 42 and 67 — search and summons — and only at the rank of Assistant Sub-Inspector and above, by the Gazette notification of 11 April 2019 circulated through Railway Board circular No. 2017/Sec(Spl)/6/7(pt) dated 26.04.2019 [1]. Page 9 of that circular directs that arrested persons and seized articles "shall be forwarded without unnecessary delay to- (a) The officer-in-charge of the nearest Police Station, or (b) The officer empowered under Section 53 of NDPS Act, 1985" [1]. The annexure of bare-act extracts RPF hands its own officers reproduces Sections 42, 43, 50, 52 and 67, and omits Section 53 entirely [1]. RPF searches; it does not investigate, hold contraband, or prosecute. The case crosses to the Government Railway Police (GRP), a state force, because police and public order are State List subjects [65]. The pattern appears in the wild: RPF constables smelled ganja aboard the Tirupati–Jammu Tawi Humsafar Express, halted the train at Nagpur and seized 85.570 kg — and the prosecution is captioned by the Police Station Officer, GRP Railway Police, Nagpur [66].

That handoff is where the evidence chain actually breaks, and it sits downstream of everything the pitch proposes to build. Under Section 52A(2) NDPS as construed in *Union of India v. Mohanlal*, (2016) 3 SCC 379, seized contraband goes to the nearest police station or a Section 53 officer, who applies to a Magistrate to certify an inventory and photographs and to draw representative samples in the Magistrate's presence; only those samples are primary evidence under Section 52A(4), and *Mangilal v. State of Madhya Pradesh* (2023) requires the Magistrate to be physically present [3, 4].

The crown jewel is misidentified twice over. The ledger is the least load-bearing part of the design: not one NDPS acquittal located here turned on an altered record. They turned on a missing malkhana register, a two-versus-three sample count, an unexplained two-month transit gap, unexamined panch witnesses, samples drawn before a gazetted officer instead of a Magistrate [5, 6]. And the weakest link is the colorimetric swab at the front of the chain, which the Narcotics Control Bureau's own doctrine calls indicative and not admissible, which no Indian standard governs, and which a Bombay High Court judge has already condemned in terms quoted at §1E [16].

The recommendation, stated once and defended throughout: build a signed, hardware-attested, externally anchored append-only log — standards-track, not a three-node Hyperledger Fabric network — and write three objects to it: the Section 43 trigger, the presumptive field-test record, and the RPF-to-GRP custody handoff. Lead the pitch with the trigger record, which carries the novelty and no legal weight today. Ship the handoff record, which carries the legal weight and little novelty. Then say the limit out loud: this does not make a field test correct. It makes it legible.

---

## 1. What the Detector Can Actually Do: IMS, Trace Detection, the Vapour-Pressure Wall, and the Handheld Swab

Trace detection captures molecules a substance sheds into air or leaves on a surface, then identifies them. Whether a mobile robot can smell something at a distance depends almost entirely on vapour pressure: how much material exists as gas at room temperature. That parameter, not sensor sophistication, sets the boundary between what a robot finds and what a human must confirm with a swab.

### A. The physics does not split where the pitch says it splits

The claim that explosives evaporate and narcotics barely do is directionally right and too coarse. Volatility sorts contraband into three tiers cutting across the explosives/narcotics boundary. TNT sits near a part per billion, room-temperature vapour pressure around 6×10⁻⁴ Pa, saturated mole fraction near 10⁻⁹ [59]. RDX, PETN and HMX sit near parts per trillion, swab-dependent [71]. The narcotics tier is lower still and different in kind: cocaine's own vapour pressure is about 3×10⁻⁷ Torr at 20 °C, so what an air sampler detects is never the drug but a degradation odorant — methyl benzoate for cocaine, benzaldehyde for methamphetamine — which DART mass spectrometry has measured migrating metres through open air, and which supplies the vapour channel's one named false-positive mechanism: in a Miami certification episode a blank box adjacent to a kilogram of cocaine drew alerts from more than half the canines tested [71].

Laboratory sensors do reach the explosives thresholds — capacitive detection resolves roughly three TNT molecules per 10¹² carrier molecules [59] — but that is laboratory maturity in a humidity-matched vapour generator, not field maturity on an open platform with food stalls, diesel exhaust and crowd-scale interferent load. *Engineering inference:* even the explosives case is not uniformly a standoff case, and a two-track story will be corrected by any technically literate judge. Tell the three-tier version.

### B. The device RPF fields is a colour kit, and its "electronic measuring instrument" is a scale

The RPF Crime Manual, Chapter 16, mandates two devices at every post and keeps their functions textually separate: a drug-testing kit, used "through smelling/burning/seeing or other method like using drug-testing kit to ascertain that the material so found is a narcotic substance," and an "electronic measuring instrument" whose stated purpose is to "measure the seized narcotic material/substance" for the seizure memo, listed adjacent to "Quantity and weight of the narcotic substance" [2]. *Verified fact:* the second device is a weighing scale, and RPF's only chemical test is a colorimetric reagent kit.

### C. The certification vacuum, audited twice

*Audited absence, survived two deliberate falsification passes:* no Indian body certifies a field detection instrument, its calibration state, or its firmware [67]. Each candidate regime was checked and each misses:

- **NABL / ISO/IEC 17025** — attaches to a laboratory's bench method for a named analyte class, not to a handheld and not to firmware.
- **Legal Metrology Act, 2009** — weights and measures, a quantity framework not reaching qualitative chemical identification.
- **MHA Qualitative Requirement and Trial Directive** — a procurement instrument, not type approval: compliance rests on manufacturer self-declaration, the trial protocol tests devices against vendor-supplied samples, and it binds only Central Armed Police Forces' purchasing [67].
- **Bureau of Indian Standards** — search returns no IS number for any drug field-detection kit [64, 67].

The evidentiary route India uses runs around all of it. Section 293 of the Code of Criminal Procedure, now Section 329 of the Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS), admits a Government scientific expert's report without live testimony on the strength of institutional office, with no textual reference to instrument certification, calibration or firmware [61, 62]. Section 329(4)(g) BNSS newly lets a State certify additional experts — a change about who counts as a witness, not about what makes an instrument trustworthy [62]. India's evidence law authenticates people, not machines. A logged firmware hash satisfies no Indian statutory requirement; it buys credibility with cross-examining counsel, which is real and much smaller. There is no certification to inherit, so the pitch line inverts: the detector is uncertified, India's own courts have said so, and the record must make that uncertainty visible.

### D. The field test is doctrinally not evidence and operationally decisive

The NCB's *Drug Law Enforcement Field Officers' Handbook* says the field test "is only indicative that the substance so recovered is a ND, PS or CS and is not admissible as evidence in the court" [67]. It describes the kit as assisting the officer "in forming a reasonable belief about a substance being a drug," directs that "This process must be recorded in the Panchanama," and requires a test memo in triplicate on the spot [16]. SWGDRUG Recommendations v7.1 likewise place colour tests in the screening tier, requiring corroboration by uncorrelated techniques [18].

Against that doctrine sits the operational record. The Quattrone Center found presumptive colour tests involved in roughly 773,000 of more than 1.5 million annual US drug arrests, and triangulated a drug-identification error rate of 1.3%–6.6% (mean 3.7%) across seven state datasets covering over 190,000 laboratory submissions, implying about 28,800 false arrests a year [19]. Jurisdiction audits run worse: Savannah's 2018 audit found a 15.4% false-positive rate, and Harris County's retrospective testing produced 212 exonerations of people who had already pleaded guilty [19]. The kits "were never designed or intended to provide conclusive evidence of the presence of drugs" [20].

*Measured result, United States only — say so every time.* No Indian equivalent exists. But the mechanism does not respect borders: reagent chemistry, human colour judgment, and a system that acts before confirmation. India has the same chemistry, the same judgment, and less documentation.

### E. The court already wrote the requirements document

In *Sagar Parshuram Joshi v. State of Maharashtra* (Bombay High Court, 15 January 2021), Shinde J. granted bail because "there are no documented set standards as to which substance upon testing with reagent/s would produce, which colour," so that "all and every aspect of field testing is left to the experience, knowledge and perception of Law Enforcement Officer" — which he called, in terms, "arbitrary" [16]. He named the comparator that exists, the US National Institute of Justice's colour-reagent standard, and recorded that "a document of this kind, if any, by Ministry of Home Affairs is not made available by the prosecution" [16, 17]. NIJ Standard-0604.01 (June 2000) has been public for a quarter-century; India has published no analogue [17, 67].

Read as a requirements document, that judgment specifies the product: reagent identity and manufacturer, lot number, expiry, storage condition, operator identity, ambient conditions, observed colour from a fixed vocabulary, the reference table matched against, and an explicit machine-readable presumptive-only flag [67]. RPF already records that a field test was done — the form exists [2]; what does not exist is the content. The narrow claim is therefore the strong one: this puts into an existing record the specific content whose absence an Indian High Court has already held dispositive.

### F. What the swab step can and cannot be made to do

The NIJ Forensic Technology Center of Excellence landscape study prices portable Raman at $12,500–$25,000, infrared and IMS at $25,000–$37,500, mass spectrometry above $50,000, and notes total cost "may be quite comparable to the total cost of color-based tests" [21]. It names the advantage that matters: "Many of these portable units store time-stamped test results on the device and can easily export spectra... In contrast, the results of color-based tests are difficult to document and degrade over time. Detailed test records can facilitate the defense of presumptive tests in court" [21].

*Engineering inference from [21] and [16] jointly, which neither source draws:* the software's job is to give a colorimetric kit the documentary properties of an instrument. A Raman device emits a spectrum, a device identifier and a timestamp automatically; a colour kit emits a human sentence in a panchanama. That gap is what Shinde J. punished, and it closes in software without buying a spectrometer — a documentation gap, not an accuracy gap. 

Nor is the instrumental alternative field-mature in the way its laboratory pedigree suggests: handheld Raman and FTIR degrade on mixtures, cutting agents, coloured or fluorescing samples and through-container reads, and none carries Indian type approval either [21, 67]. One Indian data point caps how far the accuracy critique can be pushed — *Sukhdev Singh v. State of Punjab* (2022) held that physical analysis is not prescribed under the NDPS Act for testing opium [63]. The hostility in *Joshi* was to undocumented identification, not to non-instrumental identification.

---

## 2. The Four Input Modalities Audited Individually: Vapour, Thermal, CCTV Behaviour, Parcel Manifest

The fusion stack is a phase-two roadmap item. The findings are retained here rather than argued.

| Modality | Measurement basis | What the audit establishes |
|---|---|---|
| **Vapour** | Physical, bounded by the three-tier volatility wall above | The only channel with a defensible physical measurement basis [59, 71] |
| **Thermal** | None rail-specific | No measured detection or false-alarm rates; state-of-the-art concealed-object detection requires millimetre-wave sensing, and infrared thermography at Indian stations is deployed for fever screening, not concealment [71] |
| **CCTV behaviour** | None | No benchmark contains a concealed-object class, and the human analogue is worse: across four meta-analyses spanning 400-plus studies and sixty years, behavioural deception detection performs the same as or slightly better than chance, with professional police, customs and federal agents showing no statistically significant advantage [71] |
| **Parcel / manifest** | Declared consignment against actual | The only channel with a plausible authoritative data source and the only one producing an artefact a court would recognise, but no accessible interface to Indian Railways parcel systems was established, and it addresses consignments rather than persons [71] |

Three of the four channels would, if offered to a judge as detection evidence, be weaker than the colour test the team already concedes is not evidence. None belongs in the evidence chain. They belong in a tasking layer whose output is never offered in court and whose record exists only to make the tasking auditable.

---

## 3. Fusion Math: Turning Weak Signals Into a Defensible Suspicion Score

Parked to phase two; the completed finding is reported, not deepened.

A single fused probability fails on two grounds at once. The base rate is unforgiving: at a platform prevalence around 1 in 10,000 — inherited from screening literature and labelled an assumption, since no validated Indian railway-platform base rate exists in the sources located here — reaching even a 50% positive predictive value requires roughly four stages of genuinely independent evidence each carrying a positive likelihood ratio near ten, consuming all four proposed signals with zero margin [71]. And the independence assumption fails: a person concealing a package is one physical event perturbing air chemistry, garment temperature, gait and manifest consistency through overlapping causal pathways. Vacek's canonical 1985 result is that conditionally dependent tests make the independence-assuming estimator understate true error rates — that is, overstate combined accuracy — and staging does not manufacture independence, it factors the same optimistic arithmetic across time [71]. Schneier's summary of rare-event prescreening makes the consequence concrete: false positives swamp true positives by orders of magnitude [60].

**The defensible design is to emit a non-probabilistic referral tier, never a probability.** This is not a retreat. It is the design used by the World Customs Organization SAFE Framework, India's own Central Board of Indirect Taxes and Customs risk management system, and the US Automated Targeting System, and it is the shape NATO's DEXTER programme field-trialled [71]. The sentence never to say is *73% anomaly at Coach S4*. The sentence to say is *tier-2 referral, confirmatory step pending*.

---

## 4. The Quadruped Platform: Field Maturity, Indian Prior Art, and Deployment Reality

Parked; findings retained, with one procurement correction that matters strategically.

Live searching of the Government e-Marketplace, IREPS, eprocure.gov.in, PIB and RailTel located no tender, work order, budget line or press release for chemical or narcotics detection hardware, trace detectors or drug-test kits bought by RPF or Indian Railways [68]. But Railways-side procurement for patrol robotics and station analytics is demonstrably active: East Coast Railway's DSC ARJUN robot, with facial recognition, crowd analytics and unattended-baggage detection, on a 2020–2026 Captain ARJUN → ASC ARJUN → DSC ARJUN trajectory; a RailTel and Ministry of Railways AI video-surveillance contract for New Delhi station; and RPF drone procurement [68]. **The finding is therefore not "no buyer." It is: an active buyer for robotics and analytics, and no buyer for chemical detection.** *Verified fact for the presence, audited absence for the chemical-detection gap, with a named methodological hole:* two RPF delegation-of-powers PDFs were scanned without a text layer and could not be machine-read.

That buyer profile says where to attach. The robot is a carrier for the record-keeping system, not its justification. One caution about that buyer: its stated accuracy figures are procurement specifications rather than demonstrated results — CRIS demanded 99% face-recognition accuracy across 44,038 coaches while Delhi Police's own affidavits reported trial accuracy at 2% in 2018 and below 1% by 2019 [68].

---

## 5. The Evidence Ledger: Hash Chain, Signed Append-Only Log, or Permissioned Blockchain

A hash chain seals each record with a digital fingerprint computed partly from the previous record's fingerprint, so altering any entry breaks every fingerprint after it. A permissioned blockchain adds a consensus protocol: several named organisations each keep a copy and agree on the order of entries. A time-stamp authority (TSA) is a third option — an independent service that signs a statement that a given fingerprint existed at a given moment, without ever seeing the record. These are not a hierarchy; they defend against different adversaries at different costs.

### A. The three-node Fabric design fails its own trust claim

The pitch's premise — a single database has a single administrator, and synchronised copies across RPF, a forensic lab and a court registry mean forgery requires compromising a majority — is sound. The implementation does not deliver it. Hyperledger Fabric's own documentation states that its recommended production ordering service, Raft, is crash fault tolerant and not Byzantine — it assumes nodes fail by stopping, not by lying — and says in terms that it "is not suitable to be deployed in such a harsh adversarial setting" [41]. In a three-node Raft ordering service the quorum is two of three. Fabric's Byzantine-fault-tolerant orderer follows n ≥ 3f+1, so three nodes tolerate zero malicious parties and four independently controlled nodes are the minimum to tolerate one [41]. **The line "to forge the record you'd have to compromise a majority of them simultaneously" is arithmetically true and rhetorically misleading: the majority is two, and two of the three are arms of the executive.** The design defends against a crashed server, not against a colluding administrator.

 Every participating organisation must also independently operate certificate-authority infrastructure and key management [41] — a burden landing hardest on a court registry, which has the least IT capacity and no located statutory authority to run consensus infrastructure. Concede this before a judge says it.

### B. The standards-track answers are older, stronger, and already at production scale

The single-untrusted-logger threat model was solved decades before blockchain, and the solutions are standards-track and deployed at internet scale: 

- **Schneier and Kelsey (1999)** — forward-secure hash chaining [43].
- **Crosby and Wallach history trees** — keep a single untrusted logger honest via external auditors, compressing an 800 MB trace into a 3 KB proof for an 80-million-event log at 1,750 signed events/sec on one core, four to five orders of magnitude above any narcotics event rate [42].
- **RFC 6962 Certificate Transparency** — has run that pattern for over a decade, with both its failure modes caught by tree-root comparison, consistency proofs and independent monitors [44].
- **RFC 3161** — attests time from a hash alone [45].
- **RFC 4998 Evidence Record Syntax** — carries long-term validity through renewable archive timestamps over Merkle trees [46].

NIST SP 800-86, the US federal forensic baseline, specifies message digests, write blockers and documented custody logging — blockchain appears nowhere [47]. One friction: SP 800-86 bars MD5, while the BSA Schedule still offers MD5 as a checkbox [47, 22]. Emit SHA-256.

### C. Proposal-rich, deployment-poor — and that is the opportunity

Across twelve reviewed blockchain chain-of-custody solutions assessed against ISO/IEC 27037, none establishes clear correspondence with the standard, and only 16.7% discuss legal admissibility at all [48]. A majority of the twenty-four schemes catalogued in the field's systematisation of knowledge exist only as architectural designs with no working implementation [49]. Courts have not been generous: a US court excluded blockchain-related messages as inadmissible hearsay, and the litigation literature is explicit that forking and chain unreliability give a competent litigator grounds to keep such evidence out [51]. The doctrinal reading converges: a ledger supports auditability rather than automatic truth, and any judicial presumption should be narrow, rebuttable and limited to post-registration non-alteration — never to the truth of content [50]. 

The deployment record is an announcement-to-evaluation gap: the UK Ministry of Justice and HM Courts & Tribunals Service announced a distributed-ledger evidence pilot in August 2018 whose outcome remains unpublished — *audited absence:* no evaluation, report or notice was located on gov.uk, in the MoJ and HMCTS publication listings, or in the reviewed academic literature [52, 48] — and Kerala Police's 2020 blockchain work stops at a 2019 development-stage report [70]. *Do not claim these failed; claim that nobody published what happened* — which, for a technology sold on auditability, is its own quiet indictment.

### D. India's own flagship chose hash-plus-immutable-storage

The decisive architectural datum is domestic. The eSakshya Management Guidelines, 2025, notified by the Delhi Home Department on 16 May 2025, specify a secure packet per event with a unique sixteen-digit SID, "a unique hash value to ensure integrity," storage in "immutable storage," time stamping, and Section 63(4)(c) certificates that are "e signed" — explicitly not a blockchain [34]. India's national electronic-evidence application, built by the people who will have to accept whatever this team ships, specified hash-plus-immutable-storage and not a ledger — the source records what NIC specified, not that a ledger was weighed and rejected. That is dispositive of what is adoptable rather than of what is best. It is also a vindication: whether cryptographic integrity belongs in Indian evidence practice is settled, and settled in the project's favour. What remains open is only how early in time the mechanism starts.

### E. The security engineering the pitch has not done

This is the thinnest area of the original design and the highest-value remaining work.

**Device identity and attestation.** *Verified fact:* Android key attestation produces a hardware-rooted certificate chain, generated inside the secure element or trusted execution environment, binding a key to a RootOfTrust structure carrying verifiedBootKey, deviceLocked and verifiedBootState — content that, in the Android Open Source Project's own words, "is collected or generated by code in the secure hardware and is not controlled by the platform" [53]. A self-reported firmware hash is a claim made by the very software whose integrity is in question. Whether a procurement-tier handheld exposes StrongBox (a discrete secure element) or only a trusted execution environment materially changes that claim.

 Treat Play Integrity as an ingest-time server-side check, never as the device's signing mechanism, since a Keystore attestation certificate verifies offline against Google's public root while a Play Integrity verdict must be fetched per request [53, 54]. Both attestation and multi-authority anchoring are field-mature at internet scale, with no located Indian police deployment of either [44].

**Signing at the edge.** Signing at the server proves only that the server received something. *Engineering inference:* only edge signing, inside a hardware-backed key, closes the window in which a compromised intermediary could substitute a reading before it was sealed.

**Offline operation and backdating.** Platform connectivity is intermittent, and this is the genuine unsolved design question. The construction proves exactly two things: an RFC 3161 anchor proves the hash existed no later than the anchor time, and the local hash chain fixes the relative order of offline captures — a monotonic counter inside the secure element enforcing that ordering even against a manipulated system clock, without binding to calendar time [45, 70]. Nothing proves the claimed capture time before anchoring, so the residual backdating window is exactly the capture-to-anchor gap — a physical limit, not an engineering gap, which makes anchoring cadence (every connectivity window, per station stop rather than once per shift) the only lever the design has on it.

**Key management.** Under the Information Technology Act, 2000, Section 3 "digital signature" status requires a Digital Signature Certificate from a Certifying Authority licensed by the Controller of Certifying Authorities; a device-generated keypair reaches only Section 3A "electronic signature" status, whose reliability test — exclusive linkage to the signatory, sole control at signing, and detectability of later alteration — is in substance a statutory articulation of the tamper-evidence property being engineered [56, 57, 58]. One precondition is open on this record: Section 3A(1) reads conjunctively, admitting a technique that is considered reliable *and* may be specified in the Second Schedule, so a bare self-generated device keypair may not qualify at all until the Second Schedule and the Controller's list of approved techniques have been read [56, 58]. *Audited absence:* Section 3A shows zero outward citations on Indian Kanoon — a caution, not a disqualification, particularly since eSakshya's guidelines say only "e signed" [34, 57]. Design for Section 3A as the deployable baseline, subject to that check, with a documented upgrade path to Section 3.

 Key lifecycle rests on the same timestamps: because each record is anchored close to creation and renewed under RFC 4998, a revoked officer or device key does not retroactively invalidate what it already signed [45, 46]. CERT-In's directions under Section 70B(6), dated 28 April 2022, require log retention and NTP synchronisation to NIC or NPL servers [55] — supplying the Indian-jurisdiction time root the design needs.

**Threat model.** Insider modification, device theft, replay, backdating and coerced signing. Hardware-rooted edge signing addresses the first two; local chaining plus frequent anchoring addresses replay and backdating; nothing addresses coerced signing. A signature proves who held the key, never why.

### F. The objection this recommendation invites, answered

RFC 3161 anchoring reintroduces a single trusted party at another layer. The two trusts are not the same shape. A database administrator's trust is unbounded: he reads plaintext, alters any field, reorders history, and absent chaining leaves no artefact. A TSA receives a hash and nothing else — it cannot read the record, cannot alter it, and can lie about exactly one thing, the time [45]. That lie is detectable the moment a second independent TSA in a different trust domain is asked, or a signed tree head is compared across monitors [44]. So anchor to at least two independent authorities, publish periodic signed tree heads for external monitoring, and renew archive timestamps under RFC 4998 before algorithms or TSA certificates weaken [44, 45, 46]. No architecture eliminates trust, blockchain included; it shapes it, and the goal is to make every remaining trust narrow, single-purpose and externally checkable.

### G. The comparison, scored

| Property | Hash-chained log in one database | Merkle history tree + multi-TSA anchoring + monitored tree heads | Three-node permissioned blockchain (Fabric/Raft) |
|---|---|---|---|
| Detects post-hoc alteration | Yes | Yes | Yes |
| Survives a colluding administrator | No — the team's own objection | Yes, but conditionally: only where external auditors and independent anchors actually check [42, 44] | Partially, and not as specified: a 2-of-3 quorum defeats it [41] |
| Multi-organisation endorsement at the moment of writing | No | No — endorsement is retrospective, by audit | Yes: this is the axis Fabric genuinely wins [41] |
| Byzantine fault tolerance | Not applicable | Not needed — trust is external, not consensual | No at three nodes; needs ≥4 [41] |
| Proves absolute time of an offline capture | No | Bounded by the capture-to-anchor gap [45] | No — ordering is not wall-clock time |
| Produces the Schedule hash for s.63(4)(c) | Yes | Yes | Yes |
| Long-term validity as cryptography ages | Not addressed | Yes — RFC 4998 renewal [46] | Not addressed |
| ISO/IEC 27037 correspondence in the literature | Established practice [47] | Established practice [47] | Zero across twelve reviewed schemes [48] |
| Institutional burden | Low | Low to moderate | High — every organisation runs its own certificate authority [41] |
| Buildable in a student cycle | Yes | Yes | Marginal |
| Matches what the Indian state actually built | Partly | Yes — hash, immutable storage, timestamp, e-sign [34] | No — eSakshya is explicitly not a blockchain [34] |

Column two wins on every axis but one, and column three loses on the axis it was chosen for. The exception is real and should be conceded: Fabric obtains endorsement from several organisations *at write time*, whereas the recommended architecture obtains it *afterwards*, by audit — which turns the institutional-capacity objection back on the recommendation. Crosby and Wallach's guarantee holds only where an external auditor actually challenges the logger, so a signed log nobody audits is a signed log nobody can contradict [42]. 

Discharge that dependency by naming the auditors: a second time-stamp authority in a different trust domain, a monitored publication of signed tree heads that the forensic laboratory and the GRP can each fetch and compare, and a counterpart agency contractually obliged to run the consistency proof [44, 45]. The difference from Fabric is that monitoring is a cron job against a public endpoint rather than a certificate authority and a consensus node — a burden a court registry can carry where consensus infrastructure is not, delivering the three-institution story without infrastructure none of them can operate. A design that does not fund the auditing has not bought the property. If a Fabric demonstration is wanted for the panel, run it as an explicitly labelled optional distribution layer over the same signed records, never as the source of trust.

---

## 6. Admissibility Under Section 63 of the Bharatiya Sakshya Adhiniyam, 2023 — and Whether the Device Itself Qualifies

The Bharatiya Sakshya Adhiniyam, 2023 (BSA) replaced the Indian Evidence Act, 1872 with effect from 1 July 2024. Section 63, the direct successor to the old Section 65B, lets a computer-produced record be admitted without producing the computer: it deems such output a document if conditions about the device's regular use and proper operation are met, and requires a certificate in a prescribed form. Every admissibility claim in this project runs through it.

### A. The hash requirement is real, but not where the pitch says it is

The operative text of Section 63(1)–(5) never uses the word "hash" [22, 30]. Sub-sections (1)–(3) restate the Section 65B-style conditions and treat linked devices and networks as a single computer, with the deeming fiction now expressly reaching semiconductor memory and any communication device [22, 29]. The hash requirement lives entirely in the **Schedule certificate incorporated by Section 63(4)(c)**, where both Part A (person in charge) and Part B (expert) carry the identical line "I state that the HASH value/s of the electronic/digital record/s is _________, obtained through the following algorithm:— SHA1 / SHA256 / MD5 / Other (Legally acceptable standard)" with the instruction "(Hash report to be enclosed with the certificate)" [22, 29]. Part A additionally demands device type, make and model, serial number, and IMEI/UIN/UID/MAC/Cloud ID as applicable [22, 28]. Cite the Schedule, not the operative text. *Engineering inference from the form itself:* a handheld that cannot report its own make, model, serial number and hardware identifier produces a certificate its custodian must complete from memory, and auto-populating those fields removes a whole class of cross-examination.

### B. Constitutional validity is settled, and settled favourably

In *Pune Bar Assn. v. Union of India*, 2026 SCC OnLine SC 1297 (22 May 2026), a three-judge Bench upheld Section 63(4) and its Schedule against a manifest-arbitrariness challenge, characterising the hash value as "synonymous with an electronic fingerprint" with a clear and rational nexus to the statute's object, and describing Part B's expert certification as adding "an additional layer of authenticity" [23]. The petitioner's argument that dual hash-plus-expert certification was "extremely onerous" was rejected [24]. That is the doctrinal keystone: a system generating a correct hash automatically, at capture, for every event is the least burdensome possible compliance posture with a requirement the Court has just declared proportionate.

### C. The dual signature, and the formally open Part B question

Section 63(4) requires a certificate "purporting to be signed by a person in charge of the computer or communication device or the management of the relevant activities (whichever is appropriate) and an expert" — conjunctive, where Section 65B required a single signatory [22, 30]. That is the principal structural departure.

Who the expert may be is not settled. *Pune Bar Assn.* read Sections 39(1) and 39(2) BSA harmoniously and held that because Section 39(2) — the Examiner of Electronic Evidence provision inherited from Section 45A of the Evidence Act and Section 79A of the IT Act — carries no non-obstante clause, any person with "special skill and expertise in computer science and cyber forensics" may sign Part B [23, 24]. But the Court held only that the contrary Madras High Court ruling in *R. v. B.*, (2024) 1 HCC (Mad) 531, shall not operate as binding precedent. It did not overrule it on the merits, disposed of the petition at the admission stage without notice to the Union or adversarial briefing, and expressly left the scope question open [23]. Commentary identifies a plausible drafting-error reading confining Part B to notified examiners [25, 28]. *Verified fact with the procedural weakness stated:* the favourable authority is real, recent and thin. Design so that either a Section 79A-notified Examiner or a qualified in-house expert can sign Part B, and record which.

### D. Mandatory or curable — and why the system wins either way

The split is genuine. *Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal*, (2020) 7 SCC 1, treated the certificate as a sine qua non for secondary electronic evidence, with a limited impossibility exception where the device is in third-party or investigating-agency custody [27]. Against that, *Sonu v. State of Haryana* distinguished mode of proof from inherent inadmissibility and was upheld by a three-judge Bench in *Sundar v. State*, leaving co-equal benches in tension [25], while the Kerala High Court in *Alukas Jewellery v. Anil* (17 July 2025) called the absence of certification "only a curable defect" [26]. *Kailash Pawar*, 2025 INSC 1117, draws the line by mode of proof — mandatory where the record is proved through the special statutory route without examining a witness, directory under Section 61 BSA where the custodian gives oral evidence — but on pre-BSA facts, making it persuasive rather than direct authority [26].

**A system that emits a truthful, complete certificate at the moment of record creation renders the controversy moot for its own records**, and is worth *more* under the reading unfavourable to the prosecution, because a party who can always produce the certificate never needs the impossibility exception and never needs to cure anything later. That invariance across an unresolved split is the strongest single argument in the pitch; claiming instead that the certificate is mandatory and therefore the feature essential overstates a contested point and invites a correction the team will lose.

### E. The device does not qualify, and pretending otherwise is the biggest exposure

The handheld and the log node are computers and communication devices within Section 63(1) as expanded, so records they produce fall inside the deeming fiction [22, 29]. The detector does not: a colorimetric kit is not a computer, and what enters the system is a human observation typed into one — which is why the reagent-lot, expiry and colour-vocabulary fields matter. **The certificate and the log authenticate the record of the test. Nothing in Section 63 authenticates the test.** 

Nothing in Section 63, the Schedule, CrPC Section 293 or BNSS Section 329 conditions admissibility on instrument certification, calibration state or firmware integrity [22, 61, 62]. The systematic reviewers agree: a ledger "cannot confirm that the first entry was accurate... or that the person uploading the evidence acted without bias or coercion," and false or unlawfully generated inputs "can become permanently embedded in the audit trail" [50]. That caveat belongs in the first thirty seconds of the pitch rather than the last.

---

## 7. NDPS Chain of Custody and the Digital-Evidence Stack India Already Has

Chain of custody in an NDPS prosecution is a sequence of physical acts: an officer seizes a substance, seals it, records it, deposits it in a malkhana (the police storeroom), draws samples, sends them to a laboratory, and produces the material in court. Each transfer is supposed to leave a document. Section 52A adds a step no other statute requires — a Magistrate must certify the inventory, photographs and samples, and only those samples are primary evidence.

### A. Where the cases are actually lost

*Mohammed Khalid v. State of Telangana*, 2024 INSC 158, is the most detailed catalogue available. An 80 kg ganja conviction carrying ten years' rigorous imprisonment was set aside on seven independent grounds [5]:

1. **Panch witnesses.** Two independent witnesses never examined, without explanation.
2. **Sample count.** The seizing officer testified he drew three samples and gave one to the accused, leaving two for the laboratory; the laboratory recorded receiving three — a discrepancy the Court said "completely shatters the prosecution case".
3. **Handling testimony.** Contradictory evidence about who drew and handled the samples.
4. **Repackaging.** Seized material moved from three bags into seven without court permission, memo or seal continuity.
5. **Malkhana register.** Never produced; the investigating officer admitted "I did not file any document to show that where the property was kept in Maalkhana".
6. **Transit gap.** Two months between seizure on 8 May 2009 and forwarding to the laboratory on 7 July 2009, with no link evidence.
7. **No Section 52A proceeding**, which alone rendered the laboratory report "nothing but a waste paper". The pattern repeats: *Yusuf @ Asif v. State* (13 October 2023) acquitted a defendant of roughly 20 kg of heroin solely because samples were drawn before a gazetted officer rather than a Magistrate [6], and the five-judge Bench in *Vijaysinh Chandubha Jadeja v. State of Gujarat* (2010) held the Section 50(1) duty to inform a suspect of the right to be searched before a Gazetted Officer or Magistrate to require strict rather than substantial compliance [9].

Every failure mode — seals, sample counts, malkhana registers, transit gaps, unexamined witnesses, packet mixing, the wrong officer supervising sampling — is physical or procedural. *Audited absence, and the decisive one:* not one NDPS acquittal located here turned on an altered record; they turned on records never made. No defence lawyer here argued alteration. The absence is partly a selection effect — there are barely any digital records in an NDPS chain to alter yet — so the alteration exposure is prospective, arriving as BNSS Section 105 and eSakshya digitise the chain.

A record system cannot manufacture a malkhana register, but it can make the absence of one visible in real time, refuse to advance a workflow past an unrecorded custody transfer, and enforce sample-count arithmetic — the fatal two-versus-three discrepancy is structurally a validation-rule failure. The honest claim is narrow: **the system does not prove integrity; it prevents a specific enumerated class of documentation failures that Indian appellate courts have actually punished.**

### B. The strictness split caps what may be claimed

Two lines of authority pull in opposite directions, and this report picks no winner. The strict line — *Vijaysinh* on Section 50, *Mohammed Khalid* and *Mangilal* on Section 52A [9, 5, 4] — judges acts, not records, so a verifiable custody chain is worth least there: a perfect record of a Section 50 lapse merely documents the lapse, and the lapse remains fatal. The cumulative line weighs totality, and it is there that the record earns its keep: *Bharat Aambale v. State of Chhattisgarh*, 2025 INSC 78, upheld a fifteen-year sentence despite alleged Section 52A non-compliance where seventy-three seized packets were mixed into a single composite lot before sampling, holding that procedural irregularity alone does not invalidate a prosecution where substantial evidence proves recovery, and that NCB Standing Orders are guidance, not "inexorable rules" [7]. In *Rajwant Singh v. State of Haryana* the initial burden fell on the accused to lay foundational facts of non-compliance, and defence counsel asked the investigating officer nothing [8].

The lines partition more cleanly than the disagreement suggests: the strict line governs *statutorily specified acts*, the cumulative line *executive guidance and physical-handling irregularity*. Both concern the physical thing, and a cryptographic record cannot re-seal a bag or re-count a sample. **The defensible formulation: a tamper-evident record raises the floor under the cumulative test by removing one class of doubt from the totality the court weighs, and is never sufficient on its own.**

### C. What already exists, and where the system must not duplicate it

BNSS Section 105 requires that the process of conducting a search or taking possession of property, including preparation and signing of the seizure list by witnesses, be recorded through audio-video electronic means and forwarded to the Magistrate without delay [31]. Practitioner analysis concludes it binds special statutes including NDPS, and records a 2024 Directorate of Revenue Intelligence standard operating procedure mandating such recording for Customs and NDPS searches [33]. The Allahabad High Court in *Shadab v. State of Uttar Pradesh* (5 January 2026) held the recording compulsory and not discretionary, granted bail where no video existed of the recovery of forty motorcycles, and directed the state Director General of Police to issue an SOP requiring upload to eSakshya [31, 32]. Search onward is therefore already covered by a national system with statutory force, and any product re-implementing it competes with the government and loses.

But eSakshya does not occupy the field it is assumed to occupy. The NIC application, launched 4 August 2024, provides four-minute clips, encrypted upload to Sakshya Lockers on the National Government Cloud, geotag and auto-timestamp, officer selfie authentication, an offline mode generating a local hash, QR-coded seized-property custody logging, and a dual-certificate workflow mapping to BNSS Section 329 and BSA Section 63(4) [35, 37]. Its documented scope begins after an officer has decided to search; nothing ingests pre-seizure telemetry or triage output [36]. 

Rollout is thin: as of July 2025 only seven states and four Union Territories had notified eSakshya rules, while twenty-one including Punjab, Haryana and Himachal Pradesh had not [38]. In Jammu and Kashmir, Sakshya Locker evidence cannot be directly accessed by courts, which are not fully integrated into the Inter-operable Criminal Justice System; a Rajasthan case study required about seven hours to record a single crime scene [35, 36]. Judicial pressure is nevertheless rising: the Kerala High Court identified eSakshya as the technological linchpin of the BNSS framework and directed the state police to upgrade [39]. Strong doctrinal momentum, weak operational penetration — a field being claimed by eSakshya rather than occupied by it. A record sitting upstream of eSakshya's trigger point, hash-compatible with its SID-and-hash design and able to emit a Schedule-compliant certificate, is not duplicating the national system; it is building the missing front half in a form that can be handed over intact.

CCTNS is not the answer either: it is an FIR-registration and post-FIR case-management platform, deployed at 16,276 police stations with 97% connectivity, with no module resembling a pre-decision record of why an officer initiated a stop [40]. *Audited absence.* Alongside it sit RPF's own parallel paper trails: the C-44 register's confirmed columns are information received, informer details, dispatch and recovery times, general-diary serials, property description and accused details — a case-tracking register with **no field for any chain-of-custody event after seizure** [2, 68]. RPF separately forwards Annexure-9 to the Director General of NCB within 48 hours, files NCRB-1 as seizing officer, and uploads to NCB's Seizure Information Management System [2, 68] — intelligence and statistics reporting running alongside the custody chain rather than instead of it, with no source locating any interface between the three systems [68]. **That is the whitespace: three parallel reporting systems, one statutory handoff none of them spans, and a Section 52A Magistrate proceeding no software touches.**

**Normative force, sorted: four tiers of instrument are cited here and only one binds.**

- ***Mandatory law*** — NDPS ss.42, 43, 50, 52A and 53; BSA s.63 and its Schedule; BNSS s.105; IT Act ss.3 and 3A; DPDP s.17. Breach is fatal or presumptively so.
- ***Applicable standard*** — ISO/IEC 17025 and 27037, RFC 3161, 4998 and 6962, NIJ Standard-0604.01. Breach is cross-examination material, never inadmissibility.
- ***Government guidance*** — NCB Standing Orders and the Field Officers' Handbook, the MHA Qualitative Requirement and Trial Directive, Railway Board circulars, the CCA eSignature framework, the eSakshya guidelines. Administratively binding on the officer, but not "inexorable rules" in court [7].
- ***Best practice*** — NIST SP 800-86, Crosby-Wallach history trees, hardware-rooted attestation. Binding on nobody and persuasive to everybody.

### D. Upstream or downstream — a sequencing question, not a conflict

The strongest opposing view says the real gap is upstream: a machine-generated, timestamped record of the *trigger* for a public-place stop. Section 42 NDPS requires the officer to take down information in writing and record grounds of belief before searching a building, conveyance or enclosed place, and to forward a copy to his superior [10] — that artefact exists and needs hashing, not inventing. Section 43, which governs public places, imposes no writing duty at all, and its Explanation defines public place to include "any public conveyance, hotel, shop, or other place intended for use by, or accessible to, the public," putting platforms, concourses and carriages unambiguously inside it [11, 14]. BNSS Section 105 and eSakshya both trigger at search commencement, so nothing records what preceded the decision to search [33, 36]. The nearest existing artefact is item 1 of the RPF Crime Manual's Annexure-11 Human Rights Rules compliance form — a free-text narrative asking whether the suspect was told the search rested on reason, suspicion or informant information — completed after the arrest at the record room, unintegrated with eSakshya or CCTNS [2, 69]. The form of the question exists; the contemporaneous, verifiable answer does not.

Both analyses are correct because they answer different questions: the upstream one asks whether there is an unfilled gap — yes, at exactly the search power governing the deployment — and the downstream one asks where evidence acquires legal weight, which is the Section 52A Magistrate inventory [3, 4]. **The resolution is a sequencing decision: lead the pitch with the trigger record; ship the handoff record.** A product doing only the handoff is a deployable workflow tool; one doing only the trigger is a slicker intelligence report.

That no court has demanded the trigger record describes today, not tomorrow. BNSS Section 105's videography duty was equally undemanded — on the books and unimplemented in twenty-one states a year after commencement [38] — until the Allahabad High Court confronted a recovery nobody had recorded and directed a Director General of Police to write an SOP that did not exist at the date of judgment [31, 32]. *Engineering inference from that documented sequence:* procedural norms in Indian criminal practice move when a court finds an absence intolerable, and courts find absences intolerable faster once somebody has shown the record is cheap to produce. 

The disanalogy has to be met rather than dropped: Section 105 was an enforceable statutory duty already on the books, which is precisely what let the Allahabad High Court hang an SOP on it. Section 43 imposes no writing duty, so a court minded to do the same at the trigger has no statutory hook and would have to build the obligation out of Article 21 proportionality — a longer and much less certain route, which is why the upstream case is forward-looking rather than imminent. No court demands the upstream record today.

### E. The Tofan Singh question, raised and left open

*Tofan Singh v. State of Tamil Nadu* (29 October 2020, 2:1) holds that officers invested with powers under NDPS Section 53 are police officers within Section 25 of the Evidence Act, so confessional statements recorded under Section 67 by such an officer are inadmissible [15]. RPF is empowered under Section 67 but not under Section 53 [1, 2]. On *Tofan Singh*'s own reasoning, an RPF-recorded Section 67 statement may therefore sit in a different evidentiary category.

*Open question — raised, not answered.* It has not been litigated in any source located here, and a student team asserting a novel evidentiary status for RPF statements would be making law in a pitch deck. *Design implication regardless of the answer:* tag every statement record with the recording officer's force and empowerment status, so the question can be answered later by whoever has to answer it.

---

## 8. The Legal Limits of an Algorithmic Suspicion Score

A suspicion score is a number a machine produces; "reason to believe" is a state of mind a statute demands of a human being. Whether the first can supply the second bounds this entire layer — *engineering inference from statutory text, not a holding.*

Section 43 NDPS *does* impose a reason-to-believe standard. Its text authorises an empowered officer to "seize in any public place or in transit, any narcotic drug... in respect of which he has reason to believe an offence punishable under this Act has been committed," and to "detain and search any person whom he has reason to believe to have committed an offence" — with the weaker formulation, that possession "appears to him to be unlawful," attaching only to the arrest limb [11]. **The distinction between Sections 42 and 43 is the absence of any writing duty in Section 43, not the absence of a belief standard.** Section 42 compels the officer to record grounds of belief in writing and send them to a superior; Section 43 demands the same quality of belief and requires no record of it [10, 11]. 

The Constitution Bench in *Karnail Singh v. State of Haryana* draws the contrast in those terms — Section 42 requires recording of reasons before search and seizure, and "Section 43 does not contain any such provision" — and the Delhi High Court in *Santini Simone v. Deptt. of Customs* applies it, adding that Section 42's sunrise-to-sunset restriction is likewise inapplicable in a public place [13, 14].

The officer must *hold* a reason to believe, and nothing requires him to *write it down*. A voluntary trigger record therefore documents a belief the statute already demands — a far better claim than documenting a bare subjective impression.

Two limits follow. First, a referral rank is legally sufficient, because the statute asks for belief, not a calibrated posterior; a probability is simultaneously unnecessary and, per the fusion arithmetic, unobtainable [11, 71]. That is settled enforcement convention: India's own customs service already runs a state contraband-triage score in this exact shape, CBIC's Risk Management System interdicting or facilitating a consignment with no probability stated anywhere in Circular No. 19/2023-Customs, while the WCO SAFE Framework pairs a targeting score under Standard 5 with "reason to believe" under Standard 11 as the legal threshold [71]. Indian courts have also already valued a non-human detection alert and put it where the suspicion score belongs: in *Gade Lakshmi Mangaraju v. State of Andhra Pradesh* (Andhra Pradesh High Court, 12 April 1999, affirmed AIR 2001 SC 2677), tracker-dog evidence "may not be given much value for incriminating the accused" and counts as one corroborative circumstance among others [72]. That is Indian authority about the incumbent detection modality on the railways — RPF runs canine narcotics units by zone — and a sensor stack has no claim to a higher evidentiary status than the dog it would supplement. The same case marks the residual gap: it governs what a court does with an alert at trial and says nothing about how the pre-decision alert must be recorded, which is the Section 43 whitespace at §10 item 4. 

Second, *engineering inference from Sections 1 and 7 read together:* because an arrest can proceed on a belief nobody records, and because the presumptive kit that follows has a documented error profile [19] and no documented Indian standard [16, 67], **the suspicion output must never be recorded in a form that could be read back as corroboration of the field-test result.** Two weak, correlated signals in one log look, to a trial court, like two pieces of evidence.

Finally, a system recording why a person was approached is a personal-data processing system operating on suspicion, in a jurisdiction whose Digital Personal Data Protection Act, 2023 exempts state processing broadly under Section 17, leaving post-*Puttaswamy* proportionality as the only live constraint. *Verified fact for the exemption; hypothesis for the litigation exposure that follows.* The failure case is documented rather than speculative: CBP's Automated Targeting System carries secret unreviewable profiles, forty-year retention and Privacy Act access and amendment exemptions [71]. Build purpose limitation, retention limits and access logging from the start — a voluntary accountability record that becomes a surveillance dataset would be the most embarrassing possible failure mode.

---

## 9. Predictive Patrol Routing: Efficacy Evidence, Data Requirements, and Failure Modes

Parked to phase two; findings retained, not extended.

The efficacy evidence is real, narrow, and does not obviously transfer [71]:

- **Mohler (RCTs)** — 7.4% crime-volume reduction, but required 365 prior days of data and divisions generating 1,000–2,000+ target events.
- **Pittsburgh** — 25.3% reduction in serious violent crime on 206,150 incidents over five years; only foot patrols significant.
- **Philadelphia** — no effect on violent crime.
- **2024 systematic review** — 161 studies screened, six meeting a randomised real-world bar.

Two disconfirming findings should govern the roadmap. The Pittsburgh authors deliberately avoided drug arrests because discretionary enforcement data creates the feedback loop Ensign and colleagues formalised — precisely the data this system would generate [71]. And in India, CAG Report No. 15 of 2020 found Delhi Police's CMAPS deployment stalled operationally [71]. A single station will not generate the event volume these models need, and the events it does generate are discretionary drug stops: the exact input the strongest study in the literature refused to use. Phase two should be scoped as patrol-log analytics rather than predictive routing.

---

## 10. Prior Art and Novelty Whitespace

Novelty here is not whether anyone has built a tamper-evident log. They have, for decades. It is which combination of record, jurisdiction and workflow has no published instance.

Not novel:

- A tamper-evident evidence log [42, 43, 44, 47].
- Blockchain chain-of-custody architecture — two dozen published schemes, most unimplemented [48, 49].
- Audio-video capture of search and seizure — statutorily mandated and nationally deployed [31, 35].
- Hash-based integrity for electronic evidence — eSakshya already does this per SID [34]. The architecture most resembling the pitch should be cited rather than ignored: NATO's DEXTER programme field-trialled a multi-sensor standoff detection architecture on 586 commuters in the Rome metro, for weapons and explosives — and contains zero narcotics mentions [71]. *Audited absence.* The architecture is not novel; the target is.

What **is** whitespace, in descending order of confidence:

1. **A digitised RPF-to-GRP/Section 53 custody handoff.** The Crime Manual, paragraph 13, mandates transfer "in hand to the officer in-charge of the nearest police station or to officer empowered U/S-53... who shall obtain a receipt of such transfer" [2]. What crosses is enumerable, and that enumeration is the data model: the C-44 entry, the kit result, the weighment reading, the seizure memo, the sketch map, the Annexure-I/II/V/VIII/IX paperwork and the Seizure Information Management System upload, handed to a custody chain that then runs the Section 52A inventory application, Magistrate-certified sampling, malkhana deposit and laboratory forwarding [2, 68, 3]. No existing system spans the transfer, and no case, tender or SOP located here builds it [2, 68]. *Audited absence, searched across the Crime Manual Chapter 16 primary text:* no numeric deadline is set anywhere, so "without unnecessary delay" is currently unmeasurable — a timestamped receipt turns elapsed handoff time into an auditable number rather than the contested narrative that the fatal two-month gap in *Mohammed Khalid* became [2, 5].
2. **A structured presumptive-test record** carrying the fields enumerated at §1E — the exact content whose absence Shinde J. found dispositive, recorded nowhere in Indian practice, with NCB's own handbook citing no BIS or BPR&D standard for reagent composition or shelf life [16, 67].
3. **A Section 52A workflow tool** producing the four artefacts *Mohanlal* para 13 requires — the application to the Magistrate, certification of the inventory, certification of the photographs, and representative samples drawn in the Magistrate's presence — with enforced sample-count arithmetic. Only those certified samples are primary evidence at trial, which is why this and not the sensor is where the value sits [3]. *Mohanlal* also documented, through Director General submissions across roughly twenty-five states, that malkhana storage practice is chaotic and non-uniform [3] — disconfirming evidence against the assumption that a clean digitisable custody chain already exists downstream.
4. **The upstream Section 43 trigger record**, high confidence as an absence and low weight as evidence.

*Engineering inference from audited absence:* the strongest novelty claim is jurisdictional and procedural, not cryptographic — more defensible before judges who know the cryptography is forty years old.

---

## 11. Contradictions, Weak Evidence, and Gaps Requiring Field Verification

- **The strictness split is unresolved and must stay that way** [9, 5, 4, 7, 8]. Which line a trial judge follows determines the marginal value of the whole system.
- **The Section 63 Part B expert question is formally open**, for the procedural reasons set out at §6C [23, 25].
- **The certificate sine qua non / curable split remains at co-equal-bench level** [25, 26, 27], though it is immaterial to a system generating certificates at creation.
- **The Tofan Singh question for RPF is open and unlitigated** [15, 1].
- **The procurement finding is an audited absence with a known methodological hole.** No chemical-detection procurement was found on live tender-portal searching, though an active robotics and analytics buyer exists [68]. Two RPF delegation-of-powers PDFs were scanned without a text layer — exactly where a Section 53 notification would most likely be found [1].
- **The primary circular contradicts itself on the notification number**, citing the 11 April 2019 instrument both as S.O. 1582(E) and as No. 1403 [1]. Quote the date; flag the discrepancy if quoting the number.
- **No Indian field-test error rate exists.** Every quantitative accuracy figure here is American [19, 20]. Requiring an Indian number before acting would be paralysis; presenting the US number as Indian would be misrepresentation.
- **No validated Indian railway-platform base rate for narcotics carriage exists**; the 1-in-10,000 figure is inherited, not measured [71].
- **IT Act Section 3A has zero outward citations on Indian Kanoon** [57, 70], and the prior question — whether the conjunctive s.3A(1) reaches a self-generated device keypair at all — turns on a Second Schedule not read here. *Cheapest test:* read that Schedule and the Controller's list of approved techniques, an afternoon that decides whether the deployable baseline exists [56, 58].
- **The DRI 2024 SOP was never located in primary form**; the claim rests on secondary practitioner analysis [33].
- **No Indian case was located in which a digital chain of custody was rejected — or in which one saved a prosecution.** The record is empty, which is itself the honest measure of what cryptography is currently worth in an Indian NDPS trial.

---

## 12. Claim-to-Source Ledger

Claim, status, scope and confidence sit here, with scope carried inside the Status column where it constrains transferability; title, publisher, date and URL for every bracketed reference are in the Sources section, keyed by the same number.

| Claim | Status and scope | Source | Confidence |
|---|---|---|---|
| RPF is empowered under NDPS ss.42 and 67 only, and must forward arrested persons and seized articles to the nearest police station or a s.53 officer; the annexure omits s.53 | Verified fact + audited absence | [1], [2], [68] | Very high |
| RPF-detected crime is handed to the state GRP, which prosecutes | Verified fact | [65], [66] | High |
| Magistrate-certified s.52A samples are primary evidence; absent s.52A the FSL report is "nothing but a waste paper"; sampling before a gazetted officer does not comply | Verified fact (quotation) | [3], [4], [5], [6] | Very high |
| No Indian standard prescribes colour-test reagents; field testing left to officer perception, "arbitrary"; NIJ Standard-0604.01 is the comparator India lacks | Verified fact (quotation) | [16], [17] | Very high |
| ~773,000 US drug arrests/yr involve presumptive tests; error 1.3–6.6%, mean 3.7%; ~28,800 false arrests/yr | Measured result (US only) | [19], [20] | High for US; not transferable |
| No Indian regime type-approves a field detection instrument, its calibration or its firmware | Audited absence, twice falsified | [67], [64], [61], [62] | Very high |
| The s.63 hash requirement lives in the Schedule via s.63(4)(c), not the operative text; s.63(4) requires conjunctive dual signature | Verified fact | [22], [29], [30] | Very high |
| s.63(4) upheld; hash "synonymous with an electronic fingerprint"; Part B expert identity formally open, *R. v. B.* not overruled on merits | Verified fact (quotation) + audited | [23], [24], [25] | High |
| NDPS s.43 requires "reason to believe" for seizure and detain-and-search, "appears to him to be unlawful" only for arrest, and imposes no writing duty, unlike s.42 | Verified fact | [10], [11], [13], [14] | Very high |
| Fabric Raft is crash-fault-tolerant only; 3-node quorum is 2 of 3; BFT needs ≥4 | Verified fact | [41] | Very high |
| eSakshya uses a hash per 16-digit SID in immutable storage, explicitly not a blockchain; 21 states had not notified rules as of July 2025 | Verified fact | [34], [38] | Very high |
| IT Act s.3 requires a CCA-licensed CA's DSC; a device keypair reaches only s.3A; s.3A has zero Indian Kanoon citations | Verified fact + audited absence | [56], [57], [58] | High |
| Active Railways buyer for robotics/analytics; none located for chemical detection | Verified fact + audited absence | [68] | Medium-high |
| Zero located NDPS prosecutions failed because a digital record was altered | Audited absence | [5], [6], [7], [68] | Medium-high |

---

## 13. The Do-Not-Claim List

| Retire this sentence | Say this instead |
|---|---|
| "The detector is a certified module we integrate." | No Indian regime certifies a field detection instrument, its calibration or its firmware — which is why the record around it has to be this good [67, 64]. |
| "A defence lawyer can't argue the record was altered." | Not one located NDPS acquittal involved an altered record; they involved records never made, and the system prevents an enumerated class of those failures [5, 6]. |
| "To forge the record you'd have to compromise a majority of the nodes." | Raft is crash-fault-tolerant, the majority of three is two, and Fabric's own BFT orderer needs at least four nodes [41]. |
| "Section 63 requires a hash." | The Schedule certificate incorporated by s.63(4)(c) requires the hash value; the operative text never uses the word [22, 29]. |
| "Our engineer will sign Part B." | The favourable authority is real but procedurally thin and the question was expressly left open [23, 25]. |
| "Logging the firmware hash and calibration state proves the device is trustworthy." | It satisfies no Indian statutory requirement; a hardware attestation certificate rooted in verified boot is the defensible substitute [53, 62, 67]. |
| "The officer's signature and the device timestamp fix when this happened." | The device clock is provisional until externally anchored, and a signature proves who held the key, not why [45, 70]. |
| "The ledger makes the evidence court-admissible." | It makes the record verifiable; admissibility turns on the certificate, and evidentiary weight in NDPS turns on physical custody and s.52A [22, 3]. |
| *73% anomaly at Coach S4.* | Tier-2 referral, confirmatory step pending [71]. |
| "The law requires an upstream trigger record." | s.43 imposes no writing duty and no court has demanded one; the case for building it is forward-looking and operational [11, 69]. |
| "RPF will prosecute the case." | RPF hands off to the nearest police station or a s.53 officer; the GRP prosecutes [1, 65]. |
| "Blockchain evidence systems have been deployed successfully." | The field is proposal-rich and deployment-poor, and the UK pilot published no outcome [48, 52]. |
| "There is no buyer." | An active buyer exists for robotics and analytics; none was located for chemical detection [68]. |
| "The system prevents wrongful arrest." | It makes the basis of an arrest legible; structured capture of a false positive remains a false positive. |

Two operational rules belong with the list: do not emit MD5 merely because the Schedule offers the checkbox [47, 22]; and do not claim a court registry or forensic lab will run a consensus node, for which no statutory authority, funding route or IT capacity was located [41, 68].

---

## 14. Highest-Value Uncertainties and the Cheapest Experiment for Each

Ranked by how much the answer would change the build.

1. **Would anyone actually record a trigger event that no law requires?** The entire upstream thesis depends on voluntary adoption. *Cheapest test:* a paper prototype at one RPF post — time the form and count refusals. Two days. Beyond roughly twenty seconds per stop it will not be used.
2. **Has any state gazetted RPF officers under NDPS s.53?** If yes, the two-agency finding collapses there and the handoff product loses its anchor. *Cheapest test:* an eGazette full-text search, an RTI to the Railway Board Security Directorate, and human reading of the two unreadable scans.
3. **What does the GRP actually receive at handoff today, and would it accept a digitally certified packet?** *Cheapest test:* obtain a blank handover receipt and a completed annexure set from a cooperating post, compare fields against the s.52A application a Magistrate expects, and interview two GRP investigating officers.
4. **What is the false-positive rate of the specific kit RPF fields?** Nobody knows, including RPF. *Cheapest test:* a blinded challenge panel of thirty to fifty common lawful substances scored by officers blind to ground truth. A week of work, and the first such number in India.
5. **Does the RPF kit's packaging even carry lot and expiry data?** If not, the *Joshi* record cannot be populated from the physical article. *Cheapest test:* photograph one kit's packaging. One hour.
6. **Does the target handheld carry StrongBox or only a trusted execution environment?** *Cheapest test:* run an Android key-attestation request on three candidate devices and read the security level and verified-boot state [53]. An afternoon.
7. **Is a Digital Signature Certificate feasible at officer and device scale, or is s.3A the only realistic path?** *Cheapest test:* a written quotation request to two CCA-licensed Certifying Authorities for 200 credentials [58].
8. **What is the real capture-to-connectivity gap on a target platform?** It bounds the backdating window anchoring can close. *Cheapest test:* log connectivity every sixty seconds from a phone on the platform for a week.
9. **Will a Magistrate accept a system-generated s.52A inventory and Schedule certificate?** *Cheapest test:* show a mock pair to two Special NDPS practitioners and record the objections.
10. **Does eSakshya's "e signed" mean an IT Act s.3 DSC or a s.3A electronic signature?** *Cheapest test:* an RTI to NIC and the Delhi Home Department.

Above all of these sits a cheaper and more original experiment: a two-week field note from a single station. The literature has dozens of designs and almost no deployment reports, so an honest account of what happened when a tamper-evident record met a real Indian workflow — how long each entry took, how often connectivity windows appeared, what officers refused to enter — would be a more original contribution than any published architecture.

---

## Opinionated Synthesis

Stop describing this as a detection system. Everything about detection here is physically bounded, legally uncertified or statistically indefensible: the vapour channel sees an odorant rather than the drug, the thermal and video channels have no measured rates for concealment, the fused score cannot be a probability, and the swab that ends the sequence is a colorimetric kit India has never standardised. That is not a problem for the project. It is the project.

Stop, too, treating the ledger as the crown jewel. The data structure is not the contribution, though it must still be built correctly, and the correct build is standards-track: a signed Merkle log with hardware-rooted edge signatures, multi-authority anchoring, RFC 4998 renewal and monitored tree heads, which asks a court registry to compare a published value rather than operate certifying-authority infrastructure it has neither the authority nor the capacity to run — and which is worth only as much as the comparing actually done [41, 42, 44, 46]. eSakshya specified the same shape [34].

What remains after those subtractions is a better product, living at the joint set out in §7C: **a two-agency, cross-constitutional, paper-mediated transfer between a central force and a state force, spanned by no system — not the C-44 register, not the Seizure Information Management System, not eSakshya — and it is where Indian appellate courts actually acquit people [2, 68, 38].** Build for that seam and the presumptive-test record becomes the flagship data object, because it is the one artefact travelling the whole distance from platform to Magistrate to trial. 

There is a version of this project that makes things worse — one wrapping an unreliable presumptive result in cryptographic solemnity and handing a prosecutor a record that merely *looks* forensic. There is a version that makes things better — one carrying the §1E field set, with a presumptive-only flag on the face of every record it emits. That is a week-one design choice and the most consequential decision in the build.

Three trajectories over the next three to five years decide whether this is a prototype or an institution. First, Section 105's momentum: *Shadab* converted a dormant statutory duty into a DGP-level SOP by finding an unrecorded recovery intolerable [31, 32], and the same logic has an obvious next step at the custody handoff, which Section 105 does not reach. Second, the Part B question will eventually be litigated properly with the Union heard; if it resolves toward the Madras position, every certificate needs a Section 79A-notified Examiner and the bottleneck becomes institutional, so the architecture must route a certificate to an external expert without a rebuild [23, 25]. Third, the pressure compelling an upstream trigger record is likelier to arrive from privacy doctrine than evidence law: post-*Puttaswamy* proportionality review of a sensor-assisted stop asks exactly the question Section 43 does not — on what basis did you approach this person? Meanwhile, at seven states and four Union Territories in July 2025, hash-compatibility with eSakshya rather than tight coupling is the prudent design [38, 35].

The limit has to be said out loud, because saying it is what makes the rest credible. This system does not make a field test correct; it makes the test legible to a court that today receives one sentence in a panchanama. Under the strict line that legibility cannot save a defective act — the lapse is the lapse, however well recorded. It is under the cumulative line that it earns its keep, removing one class of doubt from the totality a judge weighs [9, 5, 7, 8]. The team that says *we raise the floor at the seam where Indian NDPS cases are actually lost, and here is the High Court judgment that wrote our requirements* will beat the team that says *we put the detector on the blockchain* — not because it is more modest, but because every sentence of it can be sourced to a primary document, and the other one cannot.

---

## Sources

[1] Railway Board circular No. 2017/Sec(Spl)/6/7(pt), 26.04.2019 (delegation of NDPS powers to RPF). https://secr.indianrailways.gov.in/uploads/files/1659617585278-Delegation%20of%20powers%20to%20RPF%20under%20NDPS%20Act.pdf
[2] RPF Crime Manual, Chapter 16. https://rpf.indianrailways.gov.in/RPF/uploads/directcontent/1715581232110-1684473200925-CrimeManual.pdf
[3] Union of India v. Mohanlal, (2016) 3 SCC 379. https://indiankanoon.org/doc/129387304/
[4] Mangilal v. State of Madhya Pradesh, 2023 INSC 634. https://indiankanoon.org/doc/84654053/
[5] Mohammed Khalid v. State of Telangana, 2024 INSC 158. https://indiankanoon.org/doc/28300219/
[6] Yusuf @ Asif v. State, 2023 INSC 912. https://indiankanoon.org/doc/53648445/
[7] Bharat Aambale v. State of Chhattisgarh, 2025 INSC 78. https://indiankanoon.org/doc/94312390/
[8] Rajwant Singh v. State of Haryana, Lawbeat, 4 February 2025. https://lawbeat.in/supreme-court-judgments/accused-discharge-initial-burden-claim-non-compliance-s-52a-ndps-act-supreme-court
[9] Vijaysinh Chandubha Jadeja v. State of Gujarat, (2011) 1 SCC 609. https://indiankanoon.org/doc/1145861/
[10] Section 42, NDPS Act, 1985. https://indiankanoon.org/doc/1841395/
[11] Section 43, NDPS Act, 1985. https://indiankanoon.org/doc/1374738/
[12] Section 53, NDPS Act, 1985. https://indiankanoon.org/doc/1276310/
[13] Karnail Singh v. State of Haryana, (2009) 8 SCC 539. https://indiankanoon.org/doc/1036527/
[14] Santini Simone v. Deptt. of Customs, Delhi High Court, 5 October 2020. https://indiankanoon.org/doc/16201744/
[15] Tofan Singh v. State of Tamil Nadu, 29 October 2020. https://narcoticsindia.nic.in/Judgments/Tofan_Singh_vs_The_State_Of_Tamil_Nadu_on_29_October_2020.pdf
[16] Sagar Parshuram Joshi v. State of Maharashtra, Bombay High Court, 15 January 2021. https://indiankanoon.org/doc/90970274/
[17] NIJ Standard-0604.01, Color Test Reagents/Kits for Preliminary Identification of Drugs of Abuse, June 2000. https://nij.ojp.gov/library/publications/color-test-reagentskits-preliminary-identification-drugs-abuse-nij-standard
[18] SWGDRUG Recommendations v7.1, 9 June 2016. https://www.swgdrug.org/Documents/SWGDRUG+Recommendations+Version+7-1.pdf
[19] Guilty Until Proven Innocent, Quattrone Center, December 2023. https://www.law.upenn.edu/live/files/12890-fdt-guilty-until-proven-innocent
[20] Field Drug Test Study, Quattrone Center. https://www.law.upenn.edu/institutes/quattronecenter/reports/field-drug-test-study/
[21] Landscape Study of Field Portable Devices for Presumptive Drug Testing, NIJ FTCoE, 2018. https://www.ojp.gov/pdffiles1/nij/grants/304664.pdf
[22] Bharatiya Sakshya Adhiniyam, 2023, bare act with Schedule. https://www.indiacode.nic.in/bitstream/123456789/20063/1/aa202347.pdf
[23] Pune Bar Assn. v. Union of India, 2026 SCC OnLine SC 1297, SCC Times. https://www.scconline.com/blog/post/2026/07/08/sc-upholds-admissibility-of-electronic-evidence-under-section-63-4-bsa/
[24] Expert Competent to Sign Section 63(4) BSA Certificate, Verdictum, 28 May 2026. https://www.verdictum.in/supreme-court/qualification-section-39-bsa-not-restricted-section-79a-it-act-examiners-forensics-sign-part-b-certificate-1614860
[25] Expert Certificates, BSA, and Electronic Evidence, The Proof of Guilt, 26 August 2025. https://theproofofguilt.blogspot.com/2025/08/guest-post-expert-certificates-bsa-and.html
[26] Section 63 BSA Certificate: Latest Judgment and Legal Position, Lawful Legal. https://lawfullegal.in/section-63-of-bsa-certificate-latest-judgment-and-legal-position-2024-2026/
[27] Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal, (2020) 7 SCC 1. https://indiankanoon.org/doc/172105947/
[28] Admissibility of Electronic Evidence Under the BSA, LiveLaw, 26 June 2024. https://www.livelaw.in/articles/electronic-evidence-admissibility-section-63-bhartiya-saksha-adhiniyam-2023-261511
[29] Admissibility, Certificate and Hash Value under s.63 BSA, CorpoTech Legal. https://corpotechlegal.com/admissibility-electronic-evidence-sec-63-bsa/
[30] Section 63 BSA 2023, King Stubb & Kasiva. https://ksandk.com/litigation/section-63-bharatiya-sakshya-adhiniyam-2023/
[31] BNSS Section 105 search-and-seizure videography. https://righttoinformation.wiki/bnss-105-search-seizure-videography-mandatory-india
[32] Allahabad HC grants bail on failure to videograph recovery, SCC Times, 9 January 2026. https://www.scconline.com/blog/post/2026/01/09/all-hc-failure-to-videograph-recovery-section-105-bnss/
[33] The Expanding Reach of Section 105 BNSS in Special Statutes, GST India Biz. https://gstindia.biz/articles/2/search-seizure-and-surveillance-the-expanding-reach-of-section-105-bnss-in-special-statutes
[34] eSakshya Management Guidelines, 2025, S.S. Rana & Co. https://ssrana.in/articles/guidelines-on-esakshya/
[35] What Is E-Sakshya?, Budding Forensic Expert, May 2026. https://www.buddingforensicexpert.in/2026/05/what-is-e-sakshya.html
[36] E-Sakshya vs Crime Scene Videography, Budding Forensic Expert, May 2026. https://www.buddingforensicexpert.in/2026/05/e-sakshya-vs-crime-scene-videography.html
[37] eSakshya, NIC Informatics, October 2024. https://informatics.nic.in/files/websites/october-2024/eSakshya.php
[38] 21 states yet to notify digital evidence rules, The Tribune, 2 July 2025. https://www.tribuneindia.com/news/india/pb-haryana-himachal-among-21-states-yet-to-notify-rules-for-digital-evidence-support-system
[39] Police Must Adopt BNSS Digital Reforms: Kerala High Court, LiveLaw. https://www.livelaw.in/high-court/kerala-high-court/police-must-adopt-digital-reforms-brought-by-bnss-use-e-sakshya-for-evidence-documentation-kerala-high-court-298919
[40] Digital Police / CCTNS, Ministry of Home Affairs. https://digitalpolice.gov.in/DigitalPolice/AboutUs
[41] The Ordering Service, Hyperledger Fabric documentation. https://hyperledger-fabric.readthedocs.io/en/latest/orderer/ordering_service.html
[42] Crosby & Wallach, Efficient Data Structures for Tamper-Evident Logging, USENIX 2009. https://static.usenix.org/event/sec09/tech/full_papers/crosby.pdf
[43] Schneier & Kelsey, Secure Audit Logs to Support Computer Forensics, 1999. https://www.schneier.com/academic/archives/1999/05/secure_audit_logs_to.html
[44] RFC 6962: Certificate Transparency. https://www.rfc-editor.org/rfc/rfc6962
[45] RFC 3161: Internet X.509 PKI Time-Stamp Protocol. https://www.rfc-editor.org/rfc/rfc3161
[46] RFC 4998: Evidence Record Syntax. https://www.rfc-editor.org/rfc/rfc4998
[47] NIST SP 800-86, Guide to Integrating Forensic Techniques into Incident Response. https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-86.pdf
[48] Lavín & Llanos, Blockchain Solutions for Digital Evidence Chain of Custody. https://uvadoc.uva.es/bitstream/handle/10324/75760/_blockchain_2025_Chain_of_custody_under_iso.pdf
[49] Dasaklis, Casino & Patsakis, SoK: Blockchain Solutions for Forensics. https://arxiv.org/pdf/2005.12640
[50] Transformation of criminal proceedings in the context of digitalisation, Frontiers in Blockchain, 2026. https://www.frontiersin.org/journals/blockchain/articles/10.3389/fbloc.2026.1876350/full
[51] Sahara, Blockchain Evidence, Fordham Law Review Online, 2024. https://fordhamlawreview.org/wp-content/uploads/2024/05/Sahara-042-059.pdf
[52] UK Government Pilots Blockchain to Secure Digital Evidence, CoinDesk, 23 August 2018. https://www.coindesk.com/markets/2018/08/23/uk-government-pilots-blockchain-in-bid-to-secure-digital-evidence/
[53] Key and ID attestation, Android Open Source Project. https://source.android.com/docs/security/features/keystore/attestation
[54] Play Integrity API overview, Android Developers. https://developer.android.com/google/play/integrity/overview
[55] CERT-In Directions under s.70B(6), IT Act, 28 April 2022. https://www.cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf
[56] Information Technology Act, 2000, updated bare act. https://www.indiacode.nic.in/bitstream/123456789/13116/1/it_act_2000_updated.pdf
[57] Section 3A, Information Technology Act, 2000. https://indiankanoon.org/doc/166473284/
[58] Framework on eSignature, Controller of Certifying Authorities, MeitY. https://cca.gov.in/sites/files/pdf/guidelines/ESF.pdf
[59] Strle et al., Sensitivity Comparison of Vapor Trace Detection of Explosives, Sensors, 2014. https://pmc.ncbi.nlm.nih.gov/articles/PMC4168507/
[60] Criminal Intent Prescreening and the Base Rate Fallacy, Schneier on Security, 2012. https://www.schneier.com/blog/archives/2012/05/criminal_intent.html
[61] CrPC Section 293, Reports of Government scientific experts. https://devgan.in/crpc/section/293/
[62] How BNSS Changes Who Can Testify as a Forensic Expert. https://www.buddingforensicexpert.in/2026/05/who-can-testify-as-a-forensic-expert-in-india.html
[63] Sukhdev Singh v. State of Punjab, LiveLaw, 5 March 2022. https://www.livelaw.in/top-stories/supreme-court-ndps-act-physical-analysis-opium-sukhdev-singh-vs-state-of-punjab-2022-livelaw-sc-245-193445
[64] Bureau of Indian Standards search, "narcotic detection" (audited absence). https://www.bis.gov.in/search-standard/?searchtext=narcotic+detection
[65] Government Railway Police, institutional summary. https://en.wikipedia.org/wiki/Government_Railway_Police
[66] Karn @ Karan Kumar Das v. State of Maharashtra, Bombay HC (Nagpur), 14 February 2024. https://indiankanoon.org/doc/114601753/
[67] Internal research memorandum — the certified-module claim and the presumptive field test.
[68] Internal research memorandum — RPF NDPS mandate and the real integration target.
[69] Internal research memorandum — the upstream-of-seizure gap.
[70] Internal research memorandum — evidence-chain security engineering.
[71] Internal research memorandum — fusion cascade versus fused probability, modality and routing audits.
[72] Gade Lakshmi Mangaraju v. State of Andhra Pradesh, Andhra Pradesh High Court, 12 April 1999 (affirmed AIR 2001 SC 2677). https://indiankanoon.org/doc/1116864/
