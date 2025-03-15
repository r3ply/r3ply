#!/usr/bin/env node

// src/index.ts
import { program } from "commander";

// src/cmd.ts
import { Command } from "commander";

// src/lib.ts
import path2 from "path";
import fs2 from "fs";
import { Result as Result2 } from "oxide.ts";

// src/util.ts
import path from "path";
import fs from "fs";
import { Result } from "oxide.ts";
var util;
((util2) => {
  async function find_up(filename, cwd = process.cwd()) {
    let currentDir = cwd;
    do {
      const file_path = path.join(currentDir, filename);
      const result = await Result.safe(fs.promises.access(file_path));
      if (result.isOk()) return file_path;
      currentDir = path.dirname(currentDir);
    } while (currentDir !== path.dirname(currentDir));
    return void 0;
  }
  util2.find_up = find_up;
  function unsafeUnwrap(result) {
    return result.unwrapOrElse(() => {
      throw result.unwrapErr();
    });
  }
  util2.unsafeUnwrap = unsafeUnwrap;
  function random_int(ceiling, floor = 0) {
    return Math.floor(Math.random() * (ceiling - floor)) + floor;
  }
  util2.random_int = random_int;
  async function sha256_0x(str) {
    const encoded = new TextEncoder().encode(str);
    return crypto.subtle.digest({ name: "SHA-256" }, encoded).then((hashed_buffer) => {
      const hashArray = new Uint8Array(hashed_buffer);
      const hashHex = Array.prototype.map.call(hashArray, (byte) => {
        return ("00" + byte.toString(16)).slice(-2);
      }).join("");
      return hashHex;
    });
  }
  util2.sha256_0x = sha256_0x;
})(util || (util = {}));

// src/lib.ts
import fg from "fast-glob";
import TOML from "@iarna/toml";
import { siteConfigParser, systemConfigParser } from "@r3ply/config";
import chalk from "chalk";
import { RiMarkov, RiTa } from "rita";
import { fileURLToPath } from "url";
import { R3ply } from "@r3ply/lib";
import dayjs from "dayjs";
import { build_email } from "@r3ply/wasm";
var project;
((project2) => {
  const R3PLY_DIR = ".r3ply";
  const CONFIG_GLOB_PATTERNS = [`**/r3ply/config.{toml,json}`, `**/r3ply.config.{toml,json}`];
  async function find_r3ply_dir(cwd) {
    const find_result = util.find_up(".r3ply", cwd).then((path4) => {
      if (path4) return path4;
      else throw new Error(`No ${R3PLY_DIR} directory found. ${chalk.yellow(`You can run \`re init\` to initialize one.`)}`);
    });
    return Result2.safe(find_result);
  }
  project2.find_r3ply_dir = find_r3ply_dir;
  async function find_project_dir(cwd) {
    return find_r3ply_dir(cwd).then((r3ply_dir) => {
      return r3ply_dir.map((r3ply_dir2) => path2.dirname(r3ply_dir2));
    });
  }
  project2.find_project_dir = find_project_dir;
  async function find_config_files(from_dir, file_glob) {
    if (file_glob) return Result2.safe(fg.async([file_glob], { dot: true, cwd: from_dir }));
    else return Result2.safe(fg.async(CONFIG_GLOB_PATTERNS, { dot: true, cwd: from_dir }));
  }
  project2.find_config_files = find_config_files;
  async function get_site_config_path(cwd, config_path) {
    const full_config_path = (async () => {
      const project_dir = util.unsafeUnwrap(await find_project_dir(cwd));
      if (config_path) {
        const relative_files = util.unsafeUnwrap(await find_config_files(cwd, config_path));
        if (relative_files.length == 0) throw new Error(`No config found at ${path2.join(cwd, config_path)}`);
        else if (relative_files.length > 1) throw new Error(`Multiple matches found: ${JSON.stringify(relative_files, null, 2)}`);
        else return path2.join(cwd, relative_files[0]);
      } else {
        const relative_files = util.unsafeUnwrap(await find_config_files(project_dir));
        if (relative_files.length == 0) throw new Error(`No r3ply config found within ${project_dir}`);
        else if (relative_files.length > 1) throw new Error(`Multiple matches found: ${JSON.stringify(relative_files, null, 2)}`);
        else return path2.join(project_dir, relative_files[0]);
      }
    })();
    return Result2.safe(full_config_path);
  }
  project2.get_site_config_path = get_site_config_path;
  async function parse_site_config(cwd, config_path) {
    const parsed_site_config = get_site_config_path(cwd, config_path).then((full_config_path) => util.unsafeUnwrap(full_config_path)).then((full_config_path) => {
      return fs2.promises.readFile(full_config_path).then((site_config_bytes) => site_config_bytes.toString()).then((site_config_str) => full_config_path.endsWith(".toml") ? TOML.parse(site_config_str) : JSON.parse(site_config_str)).then((site_config_json) => siteConfigParser(JSON.stringify(site_config_json)));
    });
    return Result2.safe(parsed_site_config);
  }
  project2.parse_site_config = parse_site_config;
  async function get_site_config(cwd, config_path) {
    const site_config = parse_site_config(cwd, config_path).then((parsed_site_config) => util.unsafeUnwrap(parsed_site_config)).then((parsed_site_config) => parsed_site_config.value);
    return Result2.safe(site_config);
  }
  project2.get_site_config = get_site_config;
  async function init_r3ply_project_at(cwd, dir) {
    const new_r3ply_dir = path2.join(cwd, dir ?? "", R3PLY_DIR);
    const parent_project_exists = find_r3ply_dir(new_r3ply_dir);
    const initialize_project = parent_project_exists.then((parent_project_exists2) => {
      const file_access = Result2.safe(fs2.promises.access(new_r3ply_dir));
      return file_access.then((file_access2) => {
        if (file_access2.isErr()) {
          if (parent_project_exists2.isOk()) throw new Error(`Nested r3ply project. There is already a parent directory initialized at ${chalk.blue("`" + parent_project_exists2.unwrap() + "`")}.${chalk.yellow("(Nested projects can lead to strange effects)")}`);
          return fs2.promises.mkdir(new_r3ply_dir).then(() => {
            return fs2.promises.writeFile(path2.join(new_r3ply_dir, "placeholder.txt"), "This is just an empty file so the .r3ply directory is picked up by source control. In the future there will be more things to store here, so this file will be unnecessary.").then((_) => new_r3ply_dir);
          });
        } else {
          throw new Error(`Project already initialized at \`${chalk.reset(path2.dirname(new_r3ply_dir))}\``);
        }
      });
    });
    return Result2.safe(initialize_project);
  }
  project2.init_r3ply_project_at = init_r3ply_project_at;
})(project || (project = {}));
var markov = RiTa.markov(2, { text: ["example.com", "foo.com", "foobar.com", "monkeyisland.net"] });
var generate;
((generate2) => {
  function date(floor = Math.floor(Date.now() / 1e3) - 31536e4, ceiling = Math.floor(Date.now() / 1e3)) {
    return util.random_int(ceiling, floor) * 1e3;
  }
  generate2.date = date;
  function email_addr() {
    const first = first_names[util.random_int(first_names.length)];
    const last = last_names[util.random_int(last_names.length)];
    const name = `${first} ${last}`;
    const birthyear = util.random_int(1990, 1899);
    const domain = `${domains[util.random_int(domains.length)]}.${tlds[util.random_int(tlds.length)]}`;
    const local = `${first}.${Math.random() > 0.5 ? birthyear : last}`;
    const addr = `${local}@${domain}`;
    const mailbox = `${first} ${last} <${addr}>`;
    return { name, domain, local, addr, mailbox };
  }
  generate2.email_addr = email_addr;
  function message_id(domain) {
    return `${crypto.randomUUID()}@${domain}`;
  }
  generate2.message_id = message_id;
  function subject(url) {
    const site_path = site_paths[util.random_int(0, site_paths.length)];
    const site_slug = site_slugs[util.random_int(0, site_slugs.length)];
    return new URL(path2.join(site_path, site_slug), url).href;
  }
  generate2.subject = subject;
  function comment_body(seed) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path2.dirname(__filename);
    const modelPath = path2.join(__dirname, "comments-markov-model.json");
    const model_data = fs2.promises.readFile(modelPath, "utf-8");
    const markov2 = model_data.then((model_data2) => RiMarkov.fromJSON(model_data2));
    return markov2.then(
      (markov3) => markov3.generate({
        maxLength: 128,
        temperature: 1,
        allowDuplicates: true,
        seed
      })
    );
  }
  generate2.comment_body = comment_body;
  async function email(site_domain, r3ply_domains, options) {
    let from;
    if (options?.from) {
      from = parse_email_addr(options.from);
    } else {
      from = generate2.email_addr();
    }
    const [local, domain] = from.addr.match(/^(.+?)@(.+?)$/).slice(1, 3);
    const message_id2 = options?.messageId || generate2.message_id(domain);
    const date2 = dayjs(options?.date ?? new Date(generate2.date()));
    const to = options?.to || `${site_domain}@${r3ply_domains[util.random_int(r3ply_domains.length)]}`;
    const subject2 = options?.subject || generate2.subject(new URL(`https://${site_domain}/`));
    const body = options?.body || await generate2.comment_body();
    const email2 = Result2.safe(() => build_email(message_id2, BigInt(date2.unix()), from.name, from.addr, to, subject2, body));
    return email2.unwrap();
  }
  generate2.email = email;
  function parse_email_addr(email2) {
    const name_matches = email2.match(/^(.*?)</);
    let name;
    if (name_matches) {
      name = name_matches[1].trim();
      const email_matches = email2.match(/<(.+?)>/);
      const email_addr2 = (email_matches ?? [""])[1].trim();
      return { name, addr: email_addr2 };
    } else return { name: void 0, addr: email2 };
  }
})(generate || (generate = {}));
async function cli_handle_comment_via_email(site_config, email_bytes) {
  const cli_system_config = systemConfigParser(JSON.stringify(TOML.parse(`
version  = "0.0.1"
domain = "r3ply.com"
[[admin]]
name = "Guybrush Threepwood"
email = "guybrush@example.com"`))).value;
  const r3ply = R3ply(cli_system_config);
  const redact = util.sha256_0x;
  const comment_via_email_handler = r3ply.comments.viaEmail(redact);
  return comment_via_email_handler([site_config, email_bytes]);
}
var domains = [
  "ghostpirate",
  "lemonhead",
  "grog",
  "monkeyisland",
  "tryscummvm",
  "bananapicker",
  "meleeisland",
  "stanzboatz",
  "chickenpulley",
  "drinkgrog",
  "dontdrinkgrog"
];
var tlds = ["com", "net", "us", "biz", "org", "io"];
var first_names = [
  "LeChuck",
  "Guybrush",
  "Elaine",
  "Herman",
  "Stan",
  "Otis",
  "Wally",
  "Carla",
  "Meathook",
  "Morgan",
  "Murray",
  "Bob",
  "Horatio",
  "Ignatius",
  "Winslow",
  "Charles",
  "Kate",
  "Largo",
  "Rum",
  "Guy",
  "Haggis",
  "Cutthroat",
  "Bobby",
  "Frank",
  "Plunder",
  "Crimpdigit",
  "Jolene",
  "Dinghy",
  "Belinda",
  "Betsy",
  "Dread",
  "Esteban",
  "Rapp",
  "Doro",
  "Santiago",
  "Betty",
  "Biff",
  "Clarence",
  "Indy",
  "Henry",
  "Sallah",
  "Marion",
  "Sophia",
  "Jock",
  "Shorty",
  "Kazim",
  "Marcus",
  "Vogel"
];
var last_names = [
  "'Ghost' Pirate",
  "Threepwood",
  "Marley",
  "Toothrot",
  "Sunderson",
  "Fettucini",
  "Scabb",
  "Rottingham",
  "Ozzie",
  "Seepgood",
  "Van Helgen",
  "de Singe",
  "Bloodnose",
  "D'Oro",
  "Weatherby",
  "Nipikin",
  "Pegnose",
  "Hook",
  "Flambe",
  "Griswold",
  "Booty",
  "Bone",
  "Lemonhead",
  "Terror",
  "Snugglecakes",
  "Hartman",
  "Deadeye",
  "Graves",
  "McMutton",
  "Tannen",
  "Seagull",
  "Plank",
  "Drake",
  "Montezuma",
  "Ravenwood",
  "Donovan",
  "Oxley",
  "Brody",
  "Katanga",
  "Molotov",
  "Spalko",
  "Reinhardt",
  "Belloq",
  "Dietrich",
  "McHale",
  "Voller",
  "Strasser",
  "Krell",
  "Egon"
];
var site_slugs = [
  "how-I-met-herman-toothrot",
  "finding-dads-diary",
  "lechucks-curse-explained",
  "secrets-of-monkey-island",
  "guybrushs-best-comebacks",
  "stan-and-his-neverending-sales",
  "elaine-marley-the-real-hero",
  "murray-the-talking-skull",
  "top-10-insults-from-monkey-island",
  "puzzle-solutions-you-forgot",
  "escape-from-monkey-island-review",
  "where-is-plunder-island",
  "fettucini-brothers-circus",
  "monkey-island-easter-eggs",
  "worst-ways-to-die-in-monkey-island",
  "indiana-jones-and-the-fate-of-atlantis-retrospective",
  "top-5-foes-of-indiana-jones",
  "finding-the-lost-dialog-of-plato",
  "short-rounds-missing-adventure",
  "best-action-scenes-in-indy-games",
  "henry-jones-sr-quotes",
  "why-marion-ravenwood-rules",
  "greatest-puzzles-in-fate-of-atlantis",
  "monkey-kombat-strategy-guide",
  "the-many-faces-of-lechuck",
  "deadly-traps-in-indiana-jones-games",
  "sophia-hapgood-character-analysis",
  "replaying-last-crusade",
  "jock-lindsey-indianas-best-sidekick",
  "marcus-brody-memorial",
  "did-the-nazis-win-in-fate-of-atlantis",
  "monkey-island-hidden-dialogue",
  "lost-scenes-from-indiana-jones-games",
  "why-we-need-more-point-and-click-adventures",
  "best-inventory-items-in-monkey-island",
  "fate-of-atlantis-secret-ending",
  "best-quotes-from-monkey-island",
  "worst-decisions-in-indy-games",
  "stan-never-blinks-conspiracy",
  "top-5-worst-ways-to-lose-in-monkey-island",
  "replaying-monkey-island-in-2025",
  "who-really-invented-grog",
  "cut-content-from-monkey-island",
  "why-monkey-island-3a-needs-to-happen",
  "best-easter-eggs-in-indiana-jones-games",
  "toughest-fights-in-monkey-island",
  "horrible-ways-to-die-in-indiana-jones-games",
  "ultimate-guide-to-monkey-island-lore",
  "worst-npc-in-monkey-island",
  "is-guybrush-a-good-pirate"
];
var site_paths = [
  "blog",
  "posts",
  "articles",
  "reviews",
  "retrospectives",
  "guides",
  "walkthroughs",
  "tips",
  "secrets",
  "features",
  "history",
  "interviews",
  "behind-the-scenes",
  "lore",
  "characters",
  "analysis",
  "easter-eggs",
  "strategy",
  "rankings",
  "opinion"
];

// src/cmd.ts
import { Result as Result3 } from "oxide.ts";
import chalk2 from "chalk";
import path3 from "path";
function init_cmd(cwd) {
  const config_cmd2 = new Command("init").description("initialize a new r3ply project").argument("[directory]", "directory to initialize bare r3ply project within").action(async (directory) => {
    return project.init_r3ply_project_at(cwd, directory).then((r3ply_dir) => {
      console.log(`Initialized empty r3ply project at ${chalk2.greenBright(path3.dirname(util.unsafeUnwrap(r3ply_dir)))}`);
    });
  });
  return config_cmd2;
}
function config_cmd(cwd) {
  const config_cmd2 = new Command("config").description("various supporting operations for working with r3ply configs");
  config_cmd2.command("validate").description("validate the configuration").option("--config <path>", "specify path to config").action(async (options) => {
    const site_config = util.unsafeUnwrap(await project.parse_site_config(cwd, options.config));
    if (!site_config.valid) throw new Error(`config failed validation:

${JSON.stringify(site_config.errors, null, 2)}`);
  });
  return config_cmd2;
}
function comments_cmd(cwd) {
  const comments_cmd2 = new Command("comments").description("various supporting operations for working with r3ply comments");
  comments_cmd2.command("simulate-email").description("simulate receiving a comment via email with your current r3ply config").option("--config <config-path>", "specify path to config").option("--message-id <id>", "override Message-ID header").option("--date <date>", "override Date header").option("--from <address>", "override From header").option("--to <address>", "override To header").option("--subject <text>", "override email subject").option("--body <text>", "override email body").action(
    async (options) => {
      let site_config;
      if (options.config) {
        site_config = util.unsafeUnwrap(await project.get_site_config(cwd, options.config));
      } else {
        const project_dir = (await project.find_project_dir(cwd)).unwrap();
        site_config = util.unsafeUnwrap(await project.get_site_config(project_dir, void 0));
      }
      site_config = util.unsafeUnwrap(await project.get_site_config(cwd, options.config));
      const email = generate.email(site_config.domain, site_config.r3ply, options).then((email2) => {
        console.log(`Input email:

${chalk2.blueBright(email2.replace(/\r/g, ""))}`);
        console.log(`
${chalk2.yellow("--------------------------")}
`);
        return email2;
      });
      const comment = Result3.safe(email.then((email2) => cli_handle_comment_via_email(site_config, new TextEncoder().encode(email2))));
      await comment.then(async (comment2) => {
        if (comment2.isOk()) {
          console.log(`Output comment:

${chalk2.cyanBright(comment2.unwrap())}`);
        } else {
          throw comment2.unwrapErr();
        }
      });
    }
  );
  return comments_cmd2;
}

// src/index.ts
import chalk3 from "chalk";
program.name("re").version("1.0.0").description("CLI for r3ply, an email-based commenting service");
program.addCommand(init_cmd(process.cwd()));
program.addCommand(config_cmd(process.cwd()));
program.addCommand(comments_cmd(process.cwd()));
program.parseAsync(process.argv).catch((error) => {
  console.error(chalk3.redBright(error.message));
  process.exit(1);
});
