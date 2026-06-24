// Seeds the "aoe" schema with the approved mock tournament
// (Cụm Hải Phòng) so the public portal shows real data identical
// to the Claude Design reference. Re-runnable: clears aoe data first.
import { sql } from "./_pg.mjs";

// ---------- source data (ported from the design's mock) ----------
const RAW = [
  ["Cuồng Phong", "Nguyễn Văn An", 3],
  ["Hắc Long", "Trần Quốc Bảo", 11],
  ["Bạch Hổ", "Lê Minh Châu", 7],
  ["Lôi Vũ", "Phạm Đức Duy", 14],
  ["Thiết Mộc", "Hoàng Gia Huy", 2],
  ["Phong Vân", "Đỗ Trọng Nghĩa", 9],
  ["Tử Vi", "Vũ Hải Đăng", 5],
  ["Kim Ưng", "Bùi Thanh Tùng", 12],
  ["Hỏa Kỳ Lân", "Đặng Văn Khoa", 4],
  ["Thanh Đao", "Ngô Bá Lộc", 10],
  ["Vô Ảnh", "Dương Quang Minh", 6],
  ["Cửu Thiên", "Tạ Hữu Phúc", 15],
  ["Bắc Đẩu", "Lý Thành Long", 1],
  ["Lãng Khách", "Hồ Nhật Nam", 8],
  ["Huyền Vũ", "Mai Xuân Sơn", 13],
  ["Xích Long", "Cao Tiến Dũng", 16],
];

const groupsDef = [
  { key: "A", idx: [0, 1, 2, 3] },
  { key: "B", idx: [4, 5, 6, 7] },
  { key: "C", idx: [8, 9, 10, 11] },
  { key: "D", idx: [12, 13, 14, 15] },
];
// round-robin scorelines per group (bo3): [i,j,s1,s2,status] (i,j = index within group)
const groupResults = {
  A: [[0,1,2,0,"done"],[2,3,2,1,"done"],[0,2,2,1,"done"],[1,3,1,2,"done"],[0,3,1,1,"live"],[1,2,0,0,"pending"]],
  B: [[0,1,2,1,"done"],[2,3,0,2,"done"],[0,2,2,0,"done"],[1,3,2,0,"done"],[0,3,2,1,"done"],[1,2,1,2,"done"]],
  C: [[0,1,1,2,"done"],[2,3,2,0,"done"],[0,2,2,1,"done"],[1,3,2,1,"done"],[0,3,0,2,"done"],[1,2,1,2,"done"]],
  D: [[0,1,2,0,"done"],[2,3,2,1,"done"],[0,2,1,2,"done"],[1,3,2,0,"done"],[0,3,2,1,"done"],[1,2,2,1,"done"]],
};

// swiss: index pairs (0-based over the 16 players) + results
const swissLegs = [
  { name: "Lượt 1",
    pairs: [[0,7],[1,6],[2,5],[3,4],[8,15],[9,14],[10,13],[11,12]],
    res: [[2,0,"done"],[2,1,"done"],[0,2,"done"],[2,0,"done"],[1,2,"done"],[2,0,"done"],[2,1,"done"],[0,2,"done"]] },
  { name: "Lượt 2",
    pairs: [[0,1],[3,9],[10,8],[5,12],[7,6],[4,2],[15,14],[13,11]],
    res: [[2,1,"done"],[2,0,"done"],[1,2,"done"],[2,0,"live"],[1,2,"done"],[0,0,"pending"],[2,1,"done"],[0,2,"done"]] },
  { name: "Lượt 3",
    pairs: [[0,3],[1,10],[9,5],[6,12]],
    res: [[0,0,"pending"],[0,0,"pending"],[0,0,"pending"],[0,0,"pending"]] },
];

// knockout (8 players), indices over the 16
const koQf = [
  { a: 0, b: 7, s1: 2, s2: 0, status: "done" },
  { a: 3, b: 4, s1: 2, s2: 1, status: "done" },
  { a: 10, b: 13, s1: 1, s2: 1, status: "live" },
  { a: 9, b: 15, s1: 0, s2: 0, status: "pending" },
];

const seat = (i) => RAW[i][2];

function groupStandings(idx, results) {
  const rows = idx.map((gi, local) => ({ local, gi, win: 0, loss: 0, diff: 0 }));
  for (const [i, j, s1, s2, st] of results) {
    if (st !== "done") continue;
    rows[i].diff += s1 - s2; rows[j].diff += s2 - s1;
    if (s1 > s2) { rows[i].win++; rows[j].loss++; } else { rows[j].win++; rows[i].loss++; }
  }
  rows.sort((x, y) => y.win - x.win || y.diff - x.diff);
  rows.forEach((r, k) => { r.rank = k + 1; r.advance = k < 2; });
  return rows;
}

function swissStanding() {
  const st = RAW.map(() => ({ win: 0, loss: 0 }));
  for (const leg of swissLegs) {
    leg.pairs.forEach(([a, b], k) => {
      const [s1, s2, status] = leg.res[k];
      if (status !== "done") return;
      if (s1 > s2) { st[a].win++; st[b].loss++; } else { st[b].win++; st[a].loss++; }
    });
  }
  return st.map((r) => ({ ...r, advanced: r.win >= 2, eliminated: r.loss >= 2 }));
}

async function main() {
  // wipe (cascades through FKs)
  await sql`delete from aoe.tournaments`;
  await sql`delete from aoe.format_templates`;
  await sql`delete from aoe.app_settings`;

  const [t] = await sql`insert into aoe.tournaments (name, year, organizer)
    values ('AoE Liên Tỉnh', 2026, 'CSDN Studio') returning id`;

  const clusterDefs = [
    { name: "Cụm Hà Nội", location: "GG Center Cầu Giấy", date: "2026-06-08", status: "done", sort: 1, full: false },
    { name: "Cụm Đà Nẵng", location: "Zone 9 Esports", date: "2026-06-15", status: "done", sort: 2, full: false },
    { name: "Cụm Hải Phòng", location: "Cyber Arena Lê Chân", date: "2026-06-23", status: "live", sort: 3, full: true },
    { name: "Cụm TP.HCM", location: "Thủ Đức Arena", date: "2026-07-06", status: "draft", sort: 4, full: false },
  ];

  let hpId = null;
  for (const c of clusterDefs) {
    const [row] = await sql`insert into aoe.clusters (tournament_id, name, location, match_date, status, sort_order)
      values (${t.id}, ${c.name}, ${c.location}, ${c.date}, ${c.status}, ${c.sort}) returning id`;
    if (c.full) hpId = row.id;
  }

  // players for Hải Phòng
  const pid = []; // index -> uuid
  for (let i = 0; i < RAW.length; i++) {
    const [r0, name] = RAW[i];
    const [p] = await sql`insert into aoe.players
      (cluster_id, full_name, phone, aoe_nickname, birth_date, citizen_id, address, facebook_url)
      values (${hpId}, ${name}, ${"09" + String(10000000 + i * 1234567).slice(0, 8)}, ${r0},
        ${(1990 + (i % 12)) + "-0" + ((i % 9) + 1) + "-1" + (i % 9)},
        ${"0340" + String(98000000 + i * 731).slice(0, 8)},
        ${["Lê Chân", "Ngô Quyền", "Hồng Bàng", "Hải An", "Kiến An"][i % 5] + ", Hải Phòng"},
        ${"fb.com/" + r0.toLowerCase().replace(/\s+/g, "")}) returning id`;
    pid.push(p.id);
  }

  // ---------- Round 1: groups ----------
  const [r1] = await sql`insert into aoe.rounds (cluster_id, order_no, name, round_type, config, status)
    values (${hpId}, 1, 'Vòng bảng', 'group',
      ${sql.json({ groups_count: 4, advance_per_group: 2, best_of: 3 })}, 'done') returning id`;

  for (const g of groupsDef) {
    const [grp] = await sql`insert into aoe.groups (round_id, name) values (${r1.id}, ${g.key}) returning id`;
    const stand = groupStandings(g.idx, groupResults[g.key]);
    for (const row of stand) {
      const playerId = pid[g.idx[row.local]];
      await sql`insert into aoe.group_members (group_id, player_id, wins, score_diff, rank)
        values (${grp.id}, ${playerId}, ${row.win}, ${row.diff}, ${row.rank})`;
      await sql`insert into aoe.round_participants (round_id, player_id, outcome, wins, losses)
        values (${r1.id}, ${playerId}, ${row.advance ? "advanced" : "eliminated"}, ${row.win}, ${row.loss})`;
    }
    let so = 0;
    for (const [i, j, s1, s2, st] of groupResults[g.key]) {
      const a = g.idx[i], b = g.idx[j];
      const winner = st === "done" ? (s1 > s2 ? pid[a] : pid[b]) : null;
      await sql`insert into aoe.matches
        (round_id, group_id, player1_id, player2_id, player1_machine, player2_machine,
         player1_score, player2_score, winner_id, status, sort_order)
        values (${r1.id}, ${grp.id}, ${pid[a]}, ${pid[b]}, ${seat(a)}, ${seat(b)},
          ${s1}, ${s2}, ${winner}, ${st}, ${so++})`;
    }
  }

  // ---------- Round 2: swiss ----------
  const [r2] = await sql`insert into aoe.rounds (cluster_id, order_no, name, round_type, config, status)
    values (${hpId}, 2, 'Quần chiến', 'swiss',
      ${sql.json({ wins_to_advance: 2, best_of: 3 })}, 'live') returning id`;

  const sStand = swissStanding();
  for (let i = 0; i < RAW.length; i++) {
    const s = sStand[i];
    const outcome = s.advanced ? "advanced" : s.eliminated ? "eliminated" : "pending";
    await sql`insert into aoe.round_participants (round_id, player_id, outcome, wins, losses)
      values (${r2.id}, ${pid[i]}, ${outcome}, ${s.win}, ${s.loss})`;
  }
  let legNo = 1;
  for (const leg of swissLegs) {
    const [lg] = await sql`insert into aoe.legs (round_id, leg_no, name)
      values (${r2.id}, ${legNo++}, ${leg.name}) returning id`;
    let so = 0;
    leg.pairs.forEach(() => {});
    for (let k = 0; k < leg.pairs.length; k++) {
      const [a, b] = leg.pairs[k];
      const [s1, s2, st] = leg.res[k];
      const winner = st === "done" ? (s1 > s2 ? pid[a] : pid[b]) : null;
      await sql`insert into aoe.matches
        (round_id, leg_id, player1_id, player2_id, player1_machine, player2_machine,
         player1_score, player2_score, winner_id, status, sort_order)
        values (${r2.id}, ${lg.id}, ${pid[a]}, ${pid[b]}, ${seat(a)}, ${seat(b)},
          ${s1}, ${s2}, ${winner}, ${st}, ${so++})`;
    }
  }

  // ---------- Round 3: knockout_single ----------
  const [r3] = await sql`insert into aoe.rounds (cluster_id, order_no, name, round_type, config, status)
    values (${hpId}, 3, 'Loại trực tiếp', 'knockout_single',
      ${sql.json({ best_of: 3, final_best_of: 5, third_place: true })}, 'live') returning id`;

  const koPlayers = [...new Set(koQf.flatMap((m) => [m.a, m.b]))];
  for (const i of koPlayers) {
    await sql`insert into aoe.round_participants (round_id, player_id, outcome, wins, losses)
      values (${r3.id}, ${pid[i]}, 'pending', 0, 0)`;
  }

  const legQF = (await sql`insert into aoe.legs (round_id, leg_no, name) values (${r3.id}, 1, 'Tứ kết') returning id`)[0];
  const legSF = (await sql`insert into aoe.legs (round_id, leg_no, name) values (${r3.id}, 2, 'Bán kết') returning id`)[0];
  const legF  = (await sql`insert into aoe.legs (round_id, leg_no, name) values (${r3.id}, 3, 'Chung kết') returning id`)[0];
  const leg34 = (await sql`insert into aoe.legs (round_id, leg_no, name) values (${r3.id}, 4, 'Tranh 3–4') returning id`)[0];

  async function mkKO(legId, p1, p2, s1, s2, status, sortOrder) {
    const winner = status === "done" ? (s1 > s2 ? p1 : p2) : null;
    const [m] = await sql`insert into aoe.matches
      (round_id, leg_id, player1_id, player2_id, player1_machine, player2_machine,
       player1_score, player2_score, winner_id, status, sort_order)
      values (${r3.id}, ${legId}, ${p1}, ${p2},
        ${p1 ? seatById(p1) : null}, ${p2 ? seatById(p2) : null},
        ${s1}, ${s2}, ${winner}, ${status}, ${sortOrder}) returning id`;
    return m.id;
  }
  function seatById(playerId) {
    const i = pid.indexOf(playerId);
    return i >= 0 ? seat(i) : null;
  }

  // final + third first (so QF/SF can point to them)
  const finalId = await mkKO(legF.id, null, null, 0, 0, "pending", 0);
  const thirdId = await mkKO(leg34.id, null, null, 0, 0, "pending", 0);

  // semifinals point winner -> final, loser -> third
  const sf0 = await mkKO(legSF.id, pid[0], pid[3], 0, 0, "pending", 0);
  const sf1 = await mkKO(legSF.id, null, null, 0, 0, "pending", 1);
  await sql`update aoe.matches set next_match_id=${finalId}, next_match_slot=1, loser_next_match_id=${thirdId} where id=${sf0}`;
  await sql`update aoe.matches set next_match_id=${finalId}, next_match_slot=2, loser_next_match_id=${thirdId} where id=${sf1}`;

  // quarterfinals point to semifinals
  const sfTargets = [sf0, sf0, sf1, sf1];
  const sfSlots = [1, 2, 1, 2];
  for (let k = 0; k < koQf.length; k++) {
    const q = koQf[k];
    const id = await mkKO(legQF.id, pid[q.a], pid[q.b], q.s1, q.s2, q.status, k);
    await sql`update aoe.matches set next_match_id=${sfTargets[k]}, next_match_slot=${sfSlots[k]} where id=${id}`;
  }

  // ---------- format templates ----------
  await sql`insert into aoe.format_templates (name, description, spec) values
    ('Thể thức A — Chuẩn', 'Vòng bảng → Quần chiến → Loại trực tiếp', ${sql.json({ rounds: [
      { order_no: 1, name: "Vòng bảng", round_type: "group", config: { advance_per_group: 2, best_of: 3 } },
      { order_no: 2, name: "Quần chiến", round_type: "swiss", config: { wins_to_advance: 2, best_of: 2 } },
      { order_no: 3, name: "Loại trực tiếp", round_type: "knockout_single", config: { best_of: 4, final_best_of: 5, third_place: true } },
    ] })}),
    ('Thể thức B — Nhanh', 'Vòng bảng → Loại trực tiếp', ${sql.json({ rounds: [
      { order_no: 1, name: "Vòng bảng", round_type: "group", config: { advance_per_group: 2, best_of: 3 } },
      { order_no: 2, name: "Loại trực tiếp", round_type: "knockout_single", config: { best_of: 4, final_best_of: 5, third_place: true } },
    ] })}),
    ('Thể thức C — Quần chiến mở màn', 'Quần chiến → Vòng bảng → Loại trực tiếp', ${sql.json({ rounds: [
      { order_no: 1, name: "Quần chiến", round_type: "swiss", config: { wins_to_advance: 2, best_of: 2 } },
      { order_no: 2, name: "Vòng bảng", round_type: "group", config: { advance_per_group: 2, best_of: 3 } },
      { order_no: 3, name: "Loại trực tiếp", round_type: "knockout_single", config: { best_of: 4, final_best_of: 5, third_place: true } },
    ] })})`;

  // ---------- app settings ----------
  await sql`insert into aoe.app_settings (key, value) values
    ('current_tournament_id', ${sql.json(t.id)}),
    ('current_cluster_id', ${sql.json(hpId)}),
    ('check_duplicate_cccd', ${sql.json(false)})`;

  // counts
  const [{ count: pc }] = await sql`select count(*)::int from aoe.players`;
  const [{ count: mc }] = await sql`select count(*)::int from aoe.matches`;
  console.log(`Seed done: tournament=${t.id}, players=${pc}, matches=${mc}`);
}

main()
  .catch((e) => { console.error("Seed FAILED:", e); process.exitCode = 1; })
  .finally(() => sql.end());
