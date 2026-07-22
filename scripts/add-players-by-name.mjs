import { writeFileSync, readFileSync } from "fs";

const BASE = `https://www.thesportsdb.com/api/v1/json/${process.env.SPORTSDB_KEY ?? "3"}`;

const NAMES = [
  // ===== FREE AGENTS / ACTIVE MISSING (edit freely) =====
  "LeBron James",
  // ===== NBA LEGENDS =====
  "Michael Jordan","Kareem Abdul-Jabbar","Magic Johnson","Larry Bird","Bill Russell","Wilt Chamberlain","Kobe Bryant","Shaquille O'Neal","Tim Duncan","Hakeem Olajuwon","Oscar Robertson","Jerry West","Julius Erving","Moses Malone","Charles Barkley","Karl Malone","John Stockton","Scottie Pippen","Kevin Garnett","Dirk Nowitzki","Allen Iverson","Dwyane Wade","Isiah Thomas","David Robinson","Patrick Ewing","Elgin Baylor","Bob Pettit","Dominique Wilkins","Reggie Miller","Ray Allen","Carmelo Anthony","Vince Carter","Tracy McGrady","Chris Bosh","Tony Parker","Manu Ginobili","Pau Gasol","Dennis Rodman","Gary Payton","Jason Kidd","Steve Nash","Grant Hill","Yao Ming","Paul Pierce",
  // ===== NFL LEGENDS =====
  "Tom Brady","Jerry Rice","Jim Brown","Lawrence Taylor","Joe Montana","Walter Payton","Peyton Manning","Johnny Unitas","Reggie White","Barry Sanders","Dan Marino","John Elway","Brett Favre","Emmitt Smith","Deion Sanders","Ray Lewis","Randy Moss","Terrell Owens","Aaron Donald","J.J. Watt","Drew Brees","Ben Roethlisberger","Adrian Peterson","Rob Gronkowski","Ed Reed","Troy Polamalu","Ladainian Tomlinson","Marshawn Lynch","Calvin Johnson","Steve Young","Bruce Smith","Dick Butkus","Gale Sayers","Bart Starr","Terry Bradshaw","Franco Harris","Tony Gonzalez","Kurt Warner","Michael Strahan","Charles Woodson",
  // ===== MLB LEGENDS =====
  "Babe Ruth","Willie Mays","Hank Aaron","Ted Williams","Lou Gehrig","Mickey Mantle","Ty Cobb","Barry Bonds","Stan Musial","Joe DiMaggio","Ken Griffey Jr","Derek Jeter","Pedro Martinez","Randy Johnson","Greg Maddux","Nolan Ryan","Sandy Koufax","Bob Gibson","Roberto Clemente","Frank Robinson","Rickey Henderson","Cal Ripken Jr","Tony Gwynn","Mariano Rivera","Ichiro Suzuki","Albert Pujols","Alex Rodriguez","David Ortiz","Chipper Jones","Vladimir Guerrero","Jackie Robinson","Yogi Berra","Johnny Bench","Mike Schmidt","George Brett","Wade Boggs","Roger Clemens","Miguel Cabrera","Justin Verlander","Clayton Kershaw",
  // ===== NHL LEGENDS =====
  "Wayne Gretzky","Bobby Orr","Mario Lemieux","Gordie Howe","Maurice Richard","Jean Beliveau","Bobby Hull","Guy Lafleur","Mark Messier","Ray Bourque","Patrick Roy","Martin Brodeur","Dominik Hasek","Jaromir Jagr","Steve Yzerman","Joe Sakic","Nicklas Lidstrom","Pavel Datsyuk","Teemu Selanne","Mats Sundin","Zdeno Chara","Henrik Lundqvist","Phil Esposito","Brett Hull","Mike Bossy","Denis Potvin","Sergei Fedorov","Peter Forsberg","Eric Lindros","Daniel Alfredsson",
  // ===== SOCCER LEGENDS =====
  "Pele","Diego Maradona","Johan Cruyff","Franz Beckenbauer","Zinedine Zidane","Ronaldinho","Ronaldo Nazario","Thierry Henry","David Beckham","Steven Gerrard","Frank Lampard","Paul Scholes","Ryan Giggs","Eric Cantona","Alan Shearer","Wayne Rooney","Didier Drogba","Andrea Pirlo","Paolo Maldini","Francesco Totti","Alessandro Del Piero","Xavi Hernandez","Andres Iniesta","Iker Casillas","Sergio Ramos","Gianluigi Buffon","Kaka","Rivaldo","Roberto Carlos","Cafu","Samuel Eto'o","Zlatan Ibrahimovic","Gareth Bale","Luis Suarez","Eden Hazard","Mesut Ozil","Gerard Pique","Carles Puyol","Petr Cech","Michael Owen",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const players = JSON.parse(readFileSync("src/lib/players.json", "utf8"));
const seen = new Set(players.map((p) => p.idPlayer));
const seenNames = new Set(players.map((p) => p.strPlayer.toLowerCase()));
console.log(`Starting from ${players.length} players`);

const missed = [];
let i = 0;
for (const name of NAMES) {
  i++;
  if (seenNames.has(name.toLowerCase())) {
    console.log(`${i}/${NAMES.length} ${name}: already indexed`);
    continue;
  }
  let list = null;
  for (let attempt = 1; attempt <= 2 && list === null; attempt++) {
    try {
      const res = await fetch(`${BASE}/searchplayers.php?p=${encodeURIComponent(name)}`);
      const json = await res.json();
      list = json?.player ?? null;
      if (list === null && attempt < 2) await sleep(4000);
    } catch { if (attempt < 2) await sleep(4000); }
  }
  // take the best match: exact name, else first result
  const match =
    (list ?? []).find((p) => p.strPlayer?.toLowerCase() === name.toLowerCase()) ?? (list ?? [])[0] ?? null;
  if (!match) {
    missed.push(name);
    console.log(`${i}/${NAMES.length} ${name}: ✗ not found`);
  } else if (seen.has(match.idPlayer)) {
    console.log(`${i}/${NAMES.length} ${name}: already indexed (id)`);
  } else {
    seen.add(match.idPlayer);
    players.push({
      idPlayer: match.idPlayer,
      strPlayer: match.strPlayer,
      idTeam: match.idTeam ?? null,
      strTeam: match.strTeam ?? "Free Agent / Retired",
      strLeague: match.strLeague ?? null,
      strSport: match.strSport ?? null,
      strPosition: match.strPosition ?? null,
      strThumb: match.strCutout ?? match.strThumb ?? null,
    });
    console.log(`${i}/${NAMES.length} ${name}: ✓ ${match.strPlayer} (${match.strTeam ?? "no team"})`);
  }
  await sleep(700);
}

writeFileSync("src/lib/players.json", JSON.stringify(players));
console.log(`\nDone. ${players.length} players total.`);
if (missed.length) console.log(`Missed: ${missed.join(", ")}`);